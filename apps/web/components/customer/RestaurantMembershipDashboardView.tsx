"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { SLOT_I18N } from "../../lib/customer-i18n";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Membership = {
  id: string;
  status: string;
  mealSlots: string[];
  address: string | null;
  user?: { phone?: string | null };
};

const SLOT_EMOJI: Record<string, string> = {
  BREAKFAST: "🌅",
  LUNCH: "☀️",
  DINNER: "🌙",
};

export function RestaurantMembershipDashboardView() {
  const { locale, t } = useAppLocale();
  const user = getStoredUser();
  const [subs, setSubs] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    if (!user) return;
    setLoading(true);
    apiGet<Membership[]>(`/api/restaurant/store/membership?userId=${user.id}`)
      .then(setSubs)
      .catch((err) => setError(err instanceof Error ? err.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  const active = subs.find((s) => s.status === "ACTIVE" || s.status === "PAUSED");

  function slotLabel(slot: string) {
    return SLOT_I18N[slot]?.[locale] ?? slot;
  }

  function statusLabel(status: string) {
    if (status === "ACTIVE") return t("statusActive");
    if (status === "PAUSED") return t("restaurantMembershipPaused");
    return status;
  }

  async function pauseOneWeek() {
    if (!active) return;
    setPausing(true);
    setError("");
    try {
      await apiPost(`/api/restaurant/membership/${active.id}/pause`, { weeks: 1 });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setPausing(false);
    }
  }

  async function leaveMembership() {
    if (!active) return;
    if (!window.confirm(t("restaurantMembershipLeaveConfirm"))) return;
    setCancelling(true);
    setError("");
    try {
      await apiPost(`/api/restaurant/membership/${active.id}/cancel`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="membership-page membership-page--restaurant">
      <header className="account-page-head">
        <div>
          <p className="account-page-head__eyebrow">🍲 Restaurant</p>
          <h1 className="account-page-head__title">{t("restaurantMembershipTitle")}</h1>
          <p className="account-page-head__sub">{t("restaurantMembershipSub")}</p>
        </div>
        {!active ? (
          <Link href="/account/restaurant/membership/enroll" className="landing-btn landing-btn--navy">
            {t("restaurantMembershipEnroll")}
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
      ) : active ? (
        <section className="rest-membership-card">
          <div className="rest-membership-card__head">
            <div>
              <p className="rest-membership-card__eyebrow">{t("restaurantMembershipMemberLabel")}</p>
              <h2>{t("restaurantMembershipActiveTitle")}</h2>
            </div>
            <span
              className={`order-status ${
                active.status === "ACTIVE" ? "order-status--confirmed" : "order-status--pending"
              }`}
            >
              {statusLabel(active.status)}
            </span>
          </div>

          <div className="rest-membership-card__slots">
            {active.mealSlots.map((slot) => (
              <span key={slot} className="rest-membership-slot-chip">
                {SLOT_EMOJI[slot] ?? "🍽"} {slotLabel(slot)}
              </span>
            ))}
          </div>

          {active.address ? (
            <p className="rest-membership-card__addr">📍 {active.address}</p>
          ) : null}

          <div className="rest-membership-card__info">
            <p>{t("restaurantMembershipReminderNote")}</p>
            {!user?.phone ? (
              <p className="rest-membership-card__warn">
                {t("restaurantMembershipPhoneHint")}{" "}
                <Link href="/profile">{t("quickProfile")}</Link>
              </p>
            ) : null}
          </div>

          <div className="rest-membership-card__actions">
            {active.status === "ACTIVE" ? (
              <button
                type="button"
                className="landing-btn landing-btn--ghost landing-btn--sm"
                disabled={pausing}
                onClick={pauseOneWeek}
              >
                {pausing ? t("pausing") : t("pauseWeek")}
              </button>
            ) : null}
            <button
              type="button"
              className="landing-btn landing-btn--ghost landing-btn--sm"
              disabled={cancelling}
              onClick={leaveMembership}
            >
              {cancelling ? t("cancellingOrder") : t("restaurantMembershipLeave")}
            </button>
            <Link href="/restaurant/menu" className="landing-btn landing-btn--navy landing-btn--sm">
              {t("orderFood")}
            </Link>
          </div>
        </section>
      ) : (
        <div className="account-empty">
          <span aria-hidden>🎫</span>
          <p>{t("restaurantMembershipNone")}</p>
          <Link href="/account/restaurant/membership/enroll" className="landing-btn landing-btn--navy">
            {t("restaurantMembershipEnroll")}
          </Link>
        </div>
      )}
    </div>
  );
}
