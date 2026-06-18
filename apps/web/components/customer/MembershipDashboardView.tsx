"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { formatDate } from "../../lib/format";
import { SUB_STATUS_I18N } from "../../lib/customer-i18n";
import { deliveryDayLabel } from "@monana/grocery";
import { frequencyLabel, membershipPlanTitle } from "@monana/utils";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Subscription = {
  id: string;
  status: string;
  frequency: string;
  address: string;
  nextRunAt: string | null;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  package?: { name: string; kind: string };
  orders?: { id: string; payment?: { status: string } | null }[];
};

export function MembershipDashboardView() {
  const { locale, t } = useAppLocale();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pausingId, setPausingId] = useState<string | null>(null);

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

  return (
    <div className="membership-page">
      <header className="account-page-head">
        <div>
          <p className="account-page-head__eyebrow">{t("membership")}</p>
          <h1 className="account-page-head__title">{t("membershipTitle")}</h1>
          <p className="account-page-head__sub">{t("membershipSub")}</p>
        </div>
        <Link href="/account/subscription/enroll" className="landing-btn landing-btn--orange">
          {t("membershipEnroll")}
        </Link>
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
            const pendingOrder = sub.orders?.find(
              (o) => o.payment?.status === "PENDING" || !o.payment
            );
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
                <div className="membership-card__actions">
                  {sub.status === "PENDING_PAYMENT" && pendingOrder ? (
                    <Link
                      href={`/pay/${pendingOrder.id}`}
                      className="landing-btn landing-btn--orange landing-btn--sm"
                    >
                      {t("payNow")}
                    </Link>
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
