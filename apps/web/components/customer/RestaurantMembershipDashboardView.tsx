"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, getStoredUser } from "../../lib/admin-api";
import { SLOT_I18N } from "../../lib/customer-i18n";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Membership = {
  id: string;
  status: string;
  mealSlots: string[];
  address: string | null;
};

export function RestaurantMembershipDashboardView() {
  const { locale, t } = useAppLocale();
  const user = getStoredUser();
  const [subs, setSubs] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiGet<Membership[]>(`/api/restaurant/store/membership?userId=${user.id}`)
      .then(setSubs)
      .catch((err) => setError(err instanceof Error ? err.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const active = subs.find((s) => s.status === "ACTIVE" || s.status === "PAUSED");

  function slotLabel(slot: string) {
    return SLOT_I18N[slot]?.[locale] ?? slot;
  }

  return (
    <div className="account-page">
      <header className="account-page__head">
        <h1>{t("restaurantMembershipTitle")}</h1>
        <p>{t("restaurantMembershipSub")}</p>
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
        </div>
      ) : error ? (
        <p className="auth-form__error">{error}</p>
      ) : active ? (
        <section className="account-card">
          <h2>{t("restaurantMembershipActive")}</h2>
          <p className="account-membership-banner__meta">
            {active.mealSlots.map(slotLabel).join(" · ")}
          </p>
          {active.address ? <p>📍 {active.address}</p> : null}
          <p>{t("restaurantMembershipReminderNote")}</p>
        </section>
      ) : (
        <section className="account-card">
          <p>{t("restaurantMembershipNone")}</p>
          <Link href="/account/restaurant/membership/enroll" className="landing-btn landing-btn--navy">
            {t("restaurantMembershipEnroll")}
          </Link>
        </section>
      )}
    </div>
  );
}
