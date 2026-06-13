"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/admin-api";
import { tr, slotStatusLabel } from "../../lib/customer-i18n";
import { useCustomerLocale } from "./CustomerLocaleProvider";

type SlotRow = {
  slot: string;
  label: string;
  emoji: string;
  orderWindow: string;
  deliversFor: string;
  status: "OPEN" | "CLOSED";
  orderCount: number;
};

export function RestaurantSlotsView() {
  const { locale } = useCustomerLocale();
  const [data, setData] = useState<{ timeDisplay: string; slots: SlotRow[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ timeDisplay: string; slots: SlotRow[] }>(
      `/api/restaurant/slots/status?locale=${locale}`
    )
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [locale]);

  const orderPrefix = tr(locale, "slotOrderPrefix");
  const ordersLabel = tr(locale, "ordersToday");

  return (
    <div className="store-page">
      <header className="store-page__head">
        <div>
          <p className="store-page__eyebrow">Monana Food</p>
          <h1 className="store-page__title">{tr(locale, "slotsPageTitle")}</h1>
          <p className="store-page__sub">
            {tr(locale, "slotsPageSub")}
            {data ? ` · ${tr(locale, "currentTimeEat")}: ${data.timeDisplay}` : null}
          </p>
        </div>
        <Link href="/restaurant/menu" className="landing-btn landing-btn--orange">
          {tr(locale, "goMenu")}
        </Link>
      </header>

      {error ? <p className="auth-form__error">{error}</p> : null}

      <div className="slot-list">
        {data?.slots.map((s) => (
          <article key={s.slot} className={`slot-card slot-card--${s.status.toLowerCase()}`}>
            <span className="slot-card__emoji">{s.emoji}</span>
            <div>
              <h3>{s.label}</h3>
              <p>
                {orderPrefix}: {s.orderWindow}
              </p>
              <small>{s.deliversFor}</small>
              <small>
                {s.orderCount} {ordersLabel}
              </small>
            </div>
            <span className={`slot-tab__badge slot-tab__badge--${s.status.toLowerCase()}`}>
              {slotStatusLabel(locale, s.status)}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
