"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, getStoredUser } from "../../lib/admin-api";
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
const ALL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER"] as const;

export function RestaurantMembershipDashboardView() {
  const { locale, t } = useAppLocale();
  const user = getStoredUser();
  const [subs, setSubs] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updatingSlots, setUpdatingSlots] = useState(false);
  const [slotDraft, setSlotDraft] = useState<string[]>([]);
  const [slotSuccess, setSlotSuccess] = useState("");

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

  useEffect(() => {
    if (!active) {
      setSlotDraft([]);
      return;
    }
    setSlotDraft(active.mealSlots);
  }, [active?.id, active?.mealSlots.join(",")]);

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

  function toggleSlot(slot: string) {
    setSlotDraft((prev) => (prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot]));
  }

  async function saveMealSlots() {
    if (!active) return;
    if (slotDraft.length === 0) {
      setError(t("restaurantMembershipPickSlot"));
      return;
    }
    setUpdatingSlots(true);
    setError("");
    setSlotSuccess("");
    try {
      await apiPatch(`/api/restaurant/membership/${active.id}`, { mealSlots: slotDraft });
      setSlotSuccess(t("restaurantMembershipSlotsSaved"));
      setTimeout(() => setSlotSuccess(""), 3500);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setUpdatingSlots(false);
    }
  }

  const slotsDirty = !!active && slotDraft.slice().sort().join(",") !== active.mealSlots.slice().sort().join(",");

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

          <div className="rest-membership-editor">
            <p className="rest-membership-editor__title">{t("restaurantMembershipEditMeals")}</p>
            <div className="rest-membership-editor__list">
              {ALL_SLOTS.map((slot) => {
                const checked = slotDraft.includes(slot);
                return (
                  <label key={slot} className="rest-membership-editor__item">
                    <input type="checkbox" checked={checked} onChange={() => toggleSlot(slot)} disabled={updatingSlots} />
                    <span>
                      {SLOT_EMOJI[slot]} {slotLabel(slot)}
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              className="landing-btn landing-btn--ghost landing-btn--sm"
              disabled={updatingSlots || !slotsDirty || slotDraft.length === 0}
              onClick={saveMealSlots}
            >
              {updatingSlots ? t("saving") : t("saveMealSlots")}
            </button>
            {slotSuccess ? (
              <p className="auth-toast auth-toast--success rest-membership-editor__toast" role="status">
                {slotSuccess}
              </p>
            ) : null}
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
