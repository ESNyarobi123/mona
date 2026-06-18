"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Setup = {
  slots: { slot: string; label: string; emoji: string }[];
  hint: string;
};

const SLOT_ORDER = ["BREAKFAST", "LUNCH", "DINNER"] as const;

export function RestaurantMembershipEnrollView() {
  const router = useRouter();
  const { t } = useAppLocale();
  const user = getStoredUser();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiGet<Setup>("/api/restaurant/store/membership")
      .then(setSetup)
      .catch(() => setSetup(null));
  }, []);

  function toggle(slot: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/account/restaurant/membership/enroll")}`);
      return;
    }
    if (selected.size === 0) {
      setError(t("restaurantMembershipPickSlot"));
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost("/api/restaurant/store/membership", {
        userId: user.id,
        mealSlots: SLOT_ORDER.filter((s) => selected.has(s)),
        address: address.trim() || undefined,
        channel: "WEB",
      });
      setSuccess(t("restaurantMembershipEnrollSuccess"));
      setTimeout(() => router.push("/account/restaurant/membership"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orderFailed"));
    } finally {
      setLoading(false);
    }
  }

  const slots = setup?.slots ?? [
    { slot: "BREAKFAST", label: "Breakfast", emoji: "🌅" },
    { slot: "LUNCH", label: "Lunch", emoji: "☀️" },
    { slot: "DINNER", label: "Dinner", emoji: "🌙" },
  ];

  return (
    <div className="account-page enroll-page">
      <header className="account-page__head">
        <Link href="/account/restaurant/membership" className="order-detail-page__back">
          ← {t("backDashboard")}
        </Link>
        <h1>{t("restaurantMembershipEnrollTitle")}</h1>
        <p>{setup?.hint ?? t("restaurantMembershipSub")}</p>
      </header>

      <form className="checkout-page__form" onSubmit={submit}>
        <section className="checkout-card">
          <header className="checkout-card__head">
            <span className="checkout-card__step">1</span>
            <div>
              <h2>{t("restaurantMembershipPickMeals")}</h2>
              <p>{t("restaurantMembershipPickMealsHint")}</p>
            </div>
          </header>
          <div className="enroll-day-grid">
            {slots.map((slot) => (
              <button
                key={slot.slot}
                type="button"
                className={`enroll-day-btn ${selected.has(slot.slot) ? "enroll-day-btn--active" : ""}`}
                onClick={() => toggle(slot.slot)}
              >
                <span>
                  {slot.emoji} {slot.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="checkout-card">
          <header className="checkout-card__head">
            <span className="checkout-card__step">2</span>
            <div>
              <h2>{t("fullAddress")}</h2>
              <p>{t("optional")}</p>
            </div>
          </header>
          <label className="checkout-field">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("checkoutAddressPlaceholder")}
              autoComplete="street-address"
            />
          </label>
        </section>

        {error ? <p className="auth-form__error">{error}</p> : null}
        {success ? <p className="auth-toast auth-toast--success">{success}</p> : null}

        <button type="submit" className="landing-btn landing-btn--navy" disabled={loading || !!success}>
          {loading ? t("submittingOrder") : t("restaurantMembershipEnroll")}
        </button>
      </form>
    </div>
  );
}
