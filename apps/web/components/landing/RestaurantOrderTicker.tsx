"use client";

import { useEffect, useState } from "react";
import type { RestaurantSlotTickerData } from "@monana/restaurant";
import { tr } from "../../lib/customer-i18n";

type Props = {
  initial: RestaurantSlotTickerData;
  locale?: "en" | "sw";
};

function TickerItems({ data, locale }: { data: RestaurantSlotTickerData; locale: "en" | "sw" }) {
  const openLabel = tr(locale, "slotOpen");
  const closedLabel = tr(locale, "slotClosed");
  const ordersLabel = tr(locale, "ordersToday");
  const windowLabel = tr(locale, "slotOrderPrefix");

  return (
    <>
      {data.slots.map((slot) => (
        <span
          key={slot.slot}
          className={`landing-ticker__pill landing-ticker__pill--${slot.status.toLowerCase()}`}
        >
          <span className="landing-ticker__pill-emoji" aria-hidden>
            {slot.emoji}
          </span>
          <span className="landing-ticker__pill-label">{slot.label}</span>
          <span className="landing-ticker__pill-delivers">{slot.deliversFor}</span>
          <span className="landing-ticker__pill-hours">
            {windowLabel}: {slot.orderWindow}
          </span>
          <span className="landing-ticker__pill-status">
            {slot.status === "OPEN" ? openLabel : closedLabel}
          </span>
          {data.showOrderCounts !== false ? (
            <span className="landing-ticker__pill-orders">
              {slot.orderCount} {ordersLabel}
            </span>
          ) : null}
        </span>
      ))}
      <span className="landing-ticker__pill landing-ticker__pill--clock" aria-hidden>
        🕐 {data.timeDisplay} EAT
      </span>
    </>
  );
}

export function RestaurantOrderTicker({ initial, locale = "en" }: Props) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`/api/restaurant/slots/status?locale=${locale}&landingBoost=1`);
        const json = await res.json();
        if (json.success && json.data) setData(json.data);
      } catch {
        /* keep last good data */
      }
    };

    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [locale]);

  return (
    <div className="landing-ticker" aria-label={tr(locale, "tickerAria")}>
      <div className="landing-ticker__fade landing-ticker__fade--left" aria-hidden />
      <div className="landing-ticker__fade landing-ticker__fade--right" aria-hidden />
      <div className="landing-ticker__track">
        <div className="landing-ticker__content">
          <TickerItems data={data} locale={locale} />
          <TickerItems data={data} locale={locale} />
        </div>
      </div>
    </div>
  );
}
