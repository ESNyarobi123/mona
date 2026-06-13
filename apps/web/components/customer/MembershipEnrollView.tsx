"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { formatMoney } from "../../lib/format";
import { unitLabel } from "@monana/utils";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Plan = {
  id: "WEEKLY" | "MONTHLY";
  title: string;
  label: string;
  discountPercent: number;
  freeDelivery: boolean;
  badge: string | null;
};

type Product = {
  id: string;
  name: string;
  price: string | number;
  unit: string;
  categoryId: string | null;
};

type Setup = {
  plans: Plan[];
  deliveryDays: {
    weekly: { value: number; label: string }[];
    monthly: { hint: string; examples: { value: number; label: string }[] };
  };
  products: Product[];
  categories: { id: string; name: string }[];
};

type BasketLine = { productId: string; quantity: number };

type Preview = {
  planLabel: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  pricing: {
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    deliveryFee: number;
    total: number;
    freeDelivery: boolean;
  };
  message: string;
};

const STEPS = ["plan", "day", "basket", "confirm"] as const;
type Step = (typeof STEPS)[number];

export function MembershipEnrollView() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const user = getStoredUser();
  const [step, setStep] = useState<Step>("plan");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [plan, setPlan] = useState<"WEEKLY" | "MONTHLY" | null>(null);
  const [dayWeek, setDayWeek] = useState<number | null>(null);
  const [dayMonth, setDayMonth] = useState(15);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Setup>(`/api/grocery/store/membership?locale=${locale}`)
      .then(setSetup)
      .catch((err) => setError(err instanceof Error ? err.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [locale]);

  const basketLines: BasketLine[] = useMemo(
    () =>
      Object.entries(basket)
        .filter(([, q]) => q > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [basket]
  );

  const stepIndex = STEPS.indexOf(step);

  function setQty(productId: string, delta: number) {
    setBasket((prev) => {
      const next = Math.max(0, (prev[productId] ?? 0) + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  }

  async function loadPreview() {
    if (!plan || basketLines.length === 0) return;
    const data = await apiPost<Preview>(`/api/grocery/store/membership/preview?locale=${locale}`, {
      plan,
      defaultBasket: basketLines,
    });
    setPreview(data);
  }

  async function onContinue() {
    setError("");
    if (step === "plan") {
      if (!plan) {
        setError(t("choosePlan"));
        return;
      }
      setStep("day");
      return;
    }
    if (step === "day") {
      if (plan === "WEEKLY" && dayWeek == null) {
        setError(t("pickWeekday"));
        return;
      }
      setStep("basket");
      return;
    }
    if (step === "basket") {
      if (basketLines.length === 0) {
        setError(t("pickProducts"));
        return;
      }
      try {
        await loadPreview();
        setStep("confirm");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("actionFailed"));
      }
      return;
    }
  }

  async function onEnroll() {
    if (!user || !plan || basketLines.length === 0 || address.trim().length < 3) {
      setError(t("validAddress"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await apiPost<{
        firstOrder?: { id: string } | null;
        subscription: { id: string };
      }>("/api/grocery/store/membership", {
        userId: user.id,
        plan,
        address: address.trim(),
        channel: "WEB",
        preferredDayOfWeek: plan === "WEEKLY" ? dayWeek ?? undefined : undefined,
        preferredDayOfMonth: plan === "MONTHLY" ? dayMonth : undefined,
        defaultBasket: basketLines,
        note: note.trim() || undefined,
        startNow: false,
      });
      if (result.firstOrder?.id) {
        router.push(`/pay/${result.firstOrder.id}`);
      } else {
        router.push("/account/membership");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="account-loading account-loading--inline">
        <div className="account-loading__spinner" aria-hidden />
        <p>{t("loadingMembership")}</p>
      </div>
    );
  }

  return (
    <div className="enroll-page">
      <header className="account-page-head">
        <div>
          <Link href="/account/membership" className="order-detail-page__back">
            ← {t("back")}
          </Link>
          <h1 className="account-page-head__title">{t("enrollTitle")}</h1>
        </div>
      </header>

      <div className="enroll-steps" aria-label={t("enrollProgress")}>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`enroll-steps__item ${i <= stepIndex ? "enroll-steps__item--done" : ""} ${i === stepIndex ? "enroll-steps__item--active" : ""}`}
          >
            {i + 1}
          </span>
        ))}
      </div>

      {error ? <p className="auth-form__error">{error}</p> : null}

      {step === "plan" && setup ? (
        <section className="enroll-panel">
          <h2>{t("enrollStepPlan")}</h2>
          <div className="enroll-plans">
            {setup.plans.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`enroll-plan-card ${plan === p.id ? "enroll-plan-card--active" : ""}`}
                onClick={() => setPlan(p.id)}
              >
                <strong>{p.title}</strong>
                <span>{p.label}</span>
                {p.badge ? <small className="enroll-plan-card__badge">{p.badge}</small> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "day" && setup && plan ? (
        <section className="enroll-panel">
          <h2>{t("enrollStepDay")}</h2>
          {plan === "WEEKLY" ? (
            <div className="enroll-day-grid">
              {setup.deliveryDays.weekly.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`enroll-day-btn ${dayWeek === d.value ? "enroll-day-btn--active" : ""}`}
                  onClick={() => setDayWeek(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="enroll-panel__hint">{setup.deliveryDays.monthly.hint}</p>
              <label className="profile-field">
                <span className="profile-field__label">{t("monthDayLabel")}</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={dayMonth}
                  onChange={(e) => setDayMonth(Number(e.target.value))}
                />
              </label>
            </>
          )}
        </section>
      ) : null}

      {step === "basket" && setup ? (
        <section className="enroll-panel">
          <h2>{t("enrollStepBasket")}</h2>
          <ul className="enroll-products">
            {setup.products.map((p) => {
              const qty = basket[p.id] ?? 0;
              return (
                <li key={p.id} className="enroll-product">
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {formatMoney(p.price)} / {unitLabel(p.unit, locale)}
                    </small>
                  </div>
                  <div className="enroll-product__qty">
                    <button type="button" onClick={() => setQty(p.id, -1)} aria-label={t("reduceQty")}>
                      −
                    </button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => setQty(p.id, 1)} aria-label={t("addQty")}>
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section className="enroll-panel">
          <h2>{t("enrollStepAddress")}</h2>
          <label className="profile-field">
            <span className="profile-field__label">
              {t("address")} *
            </span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("addressPlaceholder")}
              rows={3}
              required
              minLength={3}
            />
          </label>
          <label className="profile-field">
            <span className="profile-field__label">{t("noteOptional")}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {preview ? (
            <div className="enroll-preview">
              <h3>{preview.planLabel}</h3>
              <ul>
                {preview.items.map((line, i) => (
                  <li key={i}>
                    {line.name} ×{line.quantity} — {formatMoney(line.lineTotal)}
                  </li>
                ))}
              </ul>
              <p className="enroll-preview__total">
                <strong>{formatMoney(preview.pricing.total)}</strong>
              </p>
              <p className="enroll-preview__msg">{preview.message}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="enroll-footer">
        {stepIndex > 0 ? (
          <button
            type="button"
            className="landing-btn landing-btn--ghost"
            onClick={() => setStep(STEPS[stepIndex - 1])}
            disabled={submitting}
          >
            {t("back")}
          </button>
        ) : (
          <span />
        )}
        {step === "confirm" ? (
          <button
            type="button"
            className="landing-btn landing-btn--orange"
            onClick={onEnroll}
            disabled={submitting}
          >
            {submitting ? t("enrolling") : t("confirmEnroll")}
          </button>
        ) : (
          <button type="button" className="landing-btn landing-btn--orange" onClick={onContinue}>
            {t("continue")}
          </button>
        )}
      </footer>
    </div>
  );
}
