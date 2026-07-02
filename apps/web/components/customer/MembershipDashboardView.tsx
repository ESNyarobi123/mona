"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { formatDate } from "../../lib/format";
import { SUB_STATUS_I18N } from "../../lib/customer-i18n";
import { deliveryDayLabel } from "@monana/grocery";
import { frequencyLabel, membershipPlanTitle } from "@monana/utils";
import { useAppLocale } from "../providers/AppLocaleProvider";

type PendingPayment =
  | {
      status: "ready";
      payId: string;
      kind: "ORDER" | "CHECKOUT_INTENT";
      amount: string;
      expiresAt: string | null;
    }
  | {
      status: "expired";
      amount: string | null;
    };

type Subscription = {
  id: string;
  status: string;
  frequency: string;
  address: string;
  nextRunAt: string | null;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  package?: { name: string; kind: string };
  pendingPayment?: PendingPayment | null;
};

export function MembershipDashboardView() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const user = getStoredUser();

  function load() {
    if (!user) return;
    setLoading(true);
    apiGet<Subscription[]>(`/api/grocery/subscriptions?userId=${user.id}`)
      .then(setSubs)
      .catch((err) => setError(err instanceof Error ? err.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function pauseOneWeek(subId: string) {
    setPausingId(subId);
    setError("");
    try {
      await apiPost(`/api/grocery/subscriptions/${subId}/pause`, { weeks: 1 });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setPausingId(null);
    }
  }

  async function cancelPending(subId: string) {
    if (!window.confirm(t("cancelPendingSubscriptionConfirm"))) return;
    setCancellingId(subId);
    setError("");
    try {
      await apiPost(`/api/grocery/subscriptions/${subId}/cancel-pending`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setCancellingId(null);
    }
  }

  async function resumePayment(subId: string) {
    setResumingId(subId);
    setError("");
    try {
      const payment = await apiPost<{ status: "ready"; payId: string }>(
        `/api/grocery/subscriptions/${subId}/resume-payment`,
        {}
      );
      if (payment.status === "ready" && payment.payId) {
        router.push(`/pay/${payment.payId}`);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setResumingId(null);
    }
  }

  function packageDisplayName(sub: Subscription) {
    if (sub.frequency === "WEEKLY" || sub.frequency === "MONTHLY") {
      return membershipPlanTitle(sub.frequency, locale);
    }
    return sub.package?.name ?? frequencyLabel(sub.frequency, locale);
  }

  function subStatusLabel(status: string) {
    return SUB_STATUS_I18N[status]?.[locale] ?? status;
  }

  function scheduleLabel(sub: Subscription) {
    const dayLabel = deliveryDayLabel(
      sub.frequency as "WEEKLY" | "MONTHLY",
      sub.preferredDayOfWeek,
      sub.preferredDayOfMonth,
      locale
    );
    if (dayLabel) return dayLabel;
    return frequencyLabel(sub.frequency, locale);
  }

  const pendingSub = subs.find((s) => s.status === "PENDING_PAYMENT");

  return (
    <div className="membership-page">
      <header className="account-page-head">
        <div>
          <p className="account-page-head__eyebrow">{t("membership")}</p>
          <h1 className="account-page-head__title">{t("membershipTitle")}</h1>
          <p className="account-page-head__sub">{t("membershipSub")}</p>
        </div>
        {!pendingSub ? (
          <Link href="/account/subscription/enroll" className="landing-btn landing-btn--orange">
            {t("membershipEnroll")}
          </Link>
        ) : null}
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingMembership")}</p>
        </div>
      ) : error ? (
        <p className="auth-form__error">{error}</p>
      ) : subs.length === 0 ? (
        <div className="account-empty">
          <span aria-hidden>🔄</span>
          <p>{t("membershipNone")}</p>
          <Link href="/account/subscription/enroll" className="landing-btn landing-btn--orange">
            {t("membershipEnroll")}
          </Link>
        </div>
      ) : (
        <ul className="membership-cards">
          {subs.map((sub) => {
            const pending = sub.pendingPayment;
            const payReady = pending?.status === "ready";
            const payExpired = pending?.status === "expired";

            return (
              <li key={sub.id} className="membership-card">
                <div className="membership-card__head">
                  <strong>{packageDisplayName(sub)}</strong>
                  <span
                    className={`order-status ${
                      sub.status === "ACTIVE"
                        ? "order-status--confirmed"
                        : sub.status === "PAUSED"
                          ? "order-status--pending"
                          : "order-status--pending"
                    }`}
                  >
                    {subStatusLabel(sub.status)}
                  </span>
                </div>
                <p className="membership-card__schedule">
                  📅 {scheduleLabel(sub)} · {frequencyLabel(sub.frequency, locale)}
                </p>
                <p className="membership-card__addr">📍 {sub.address}</p>
                {sub.nextRunAt ? (
                  <p className="membership-card__next">
                    {t("nextDelivery")}: <strong>{formatDate(sub.nextRunAt)}</strong>
                  </p>
                ) : null}

                {sub.status === "PENDING_PAYMENT" ? (
                  <p className="membership-card__pending-note">
                    {payExpired ? t("subscriptionPaymentExpired") : t("subscriptionPaymentPending")}
                  </p>
                ) : null}

                <div className="membership-card__actions">
                  {sub.status === "PENDING_PAYMENT" ? (
                    <>
                      {payReady ? (
                        <Link
                          href={`/pay/${pending.payId}`}
                          className="landing-btn landing-btn--orange landing-btn--sm"
                        >
                          {t("payNow")}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="landing-btn landing-btn--orange landing-btn--sm"
                          disabled={resumingId === sub.id}
                          onClick={() => resumePayment(sub.id)}
                        >
                          {resumingId === sub.id ? t("loadingPayment") : t("resumePayment")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="landing-btn landing-btn--ghost landing-btn--sm"
                        disabled={cancellingId === sub.id}
                        onClick={() => cancelPending(sub.id)}
                      >
                        {cancellingId === sub.id ? t("cancellingOrder") : t("cancelSubscription")}
                      </button>
                    </>
                  ) : null}
                  {sub.status === "ACTIVE" ? (
                    <button
                      type="button"
                      className="landing-btn landing-btn--ghost landing-btn--sm"
                      disabled={pausingId === sub.id}
                      onClick={() => pauseOneWeek(sub.id)}
                    >
                      {pausingId === sub.id ? t("pausing") : t("pauseWeek")}
                    </button>
                  ) : null}
                  <Link href="/grocery/products" className="landing-btn landing-btn--ghost landing-btn--sm">
                    {t("shopGrocery")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="account-delivery-hint">{t("membershipHint")}</p>
    </div>
  );
}
