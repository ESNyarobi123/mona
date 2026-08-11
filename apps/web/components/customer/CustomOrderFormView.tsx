"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { useAppLocale } from "../providers/AppLocaleProvider";

type LeadInfo = {
  minLeadHours: number;
  recommendedLeadHours: number;
  messageSw: string;
  messageEn: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function CustomOrderFormView() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const user = getStoredUser();

  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [dishName, setDishName] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [requestedFor, setRequestedFor] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const minLocal = useMemo(() => {
    const hours = lead?.minLeadHours ?? 2.5;
    return toLocalInputValue(new Date(Date.now() + hours * 60 * 60 * 1000 + 60_000));
  }, [lead]);

  useEffect(() => {
    apiGet<LeadInfo>("/api/restaurant/social-orders?meta=lead-time")
      .then((data) => {
        setLead(data);
        const hours = data.minLeadHours ?? 2.5;
        setRequestedFor(toLocalInputValue(new Date(Date.now() + Math.max(hours, 3) * 60 * 60 * 1000)));
      })
      .catch(() => {
        setRequestedFor(toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)));
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/restaurant/social-order")}`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const when = new Date(requestedFor);
      if (Number.isNaN(when.getTime())) {
        throw new Error(t("customOrderTimeLabel"));
      }

      await apiPost("/api/restaurant/social-orders", {
        userId: user.id,
        dishName: dishName.trim(),
        specialRequirements: specialRequirements.trim() || undefined,
        requestedFor: when.toISOString(),
        address: address.trim() || undefined,
        channel: "WEB",
      });

      setSuccess(t("customOrderSuccess"));
      setDishName("");
      setSpecialRequirements("");
      setTimeout(() => router.push("/restaurant/social-order/requests"), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orderFailed"));
    } finally {
      setLoading(false);
    }
  }

  const ruleText =
    locale === "sw" ? lead?.messageSw ?? t("customOrderTimeHint") : lead?.messageEn ?? t("customOrderTimeHint");

  return (
    <div className="store-page store-page--narrow custom-order-page">
      <header className="store-page__head">
        <div>
          <Link href="/restaurant" className="order-detail-page__back">
            ← {t("navRestaurant")}
          </Link>
          <p className="store-page__eyebrow">Monana Food</p>
          <h1 className="store-page__title">{t("customOrderPageTitle")}</h1>
          <p className="store-page__sub">{t("customOrderPageSub")}</p>
        </div>
      </header>

      <aside className="custom-order-rule" role="note">
        <strong>⏱ {t("customOrderTimeLabel")}</strong>
        <p>{ruleText}</p>
        <p className="custom-order-rule__cod">{t("customOrderNoCod")}</p>
      </aside>

      {!user ? (
        <p className="store-page__hint">
          {t("customOrderLoginRequired")}{" "}
          <Link href={`/login?next=${encodeURIComponent("/restaurant/social-order")}`}>{t("login")}</Link>
        </p>
      ) : null}

      <form className="checkout-page__form custom-order-form" onSubmit={submit}>
        <section className="checkout-card">
          <label className="checkout-field">
            <span>{t("customOrderDishLabel")}</span>
            <input
              required
              minLength={2}
              maxLength={160}
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder={t("customOrderDishPlaceholder")}
              autoComplete="off"
            />
          </label>

          <label className="checkout-field">
            <span>{t("customOrderRequirementsLabel")}</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder={t("customOrderRequirementsPlaceholder")}
            />
          </label>

          <label className="checkout-field">
            <span>{t("customOrderTimeLabel")}</span>
            <input
              required
              type="datetime-local"
              min={minLocal}
              value={requestedFor}
              onChange={(e) => setRequestedFor(e.target.value)}
            />
            <small className="checkout-field__hint">{t("customOrderTimeHint")}</small>
          </label>

          <label className="checkout-field">
            <span>{t("customOrderAddressLabel")}</span>
            <input
              maxLength={500}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("customOrderAddressPlaceholder")}
            />
          </label>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <button type="submit" className="landing-btn landing-btn--orange" disabled={loading || !user}>
          {loading ? t("customOrderSubmitting") : t("customOrderSubmit")}
        </button>
      </form>
    </div>
  );
}
