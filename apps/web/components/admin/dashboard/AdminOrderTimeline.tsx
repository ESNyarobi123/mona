"use client";

import { orderProgress } from "../../../lib/admin-dashboard";
import { orderStatusLabel } from "../../../lib/customer-i18n";
import type { AppLocale } from "@monana/i18n";

const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "ON_THE_WAY", "DELIVERED"] as const;

export function AdminOrderTimeline({
  status,
  locale,
  compact = false,
}: {
  status: string;
  locale: AppLocale;
  compact?: boolean;
}) {
  if (status === "CANCELLED") {
    return (
      <div className={`admin-order-timeline admin-order-timeline--cancelled${compact ? " is-compact" : ""}`}>
        <span className="admin-order-timeline__cancelled">{orderStatusLabel(locale, "CANCELLED")}</span>
      </div>
    );
  }

  const currentIdx = STEPS.indexOf(status as (typeof STEPS)[number]);
  const pct = orderProgress(status);

  return (
    <div className={`admin-order-timeline${compact ? " is-compact" : ""}`}>
      {!compact ? (
        <ol className="admin-order-timeline__steps">
          {STEPS.map((step, idx) => {
            const done = currentIdx >= idx;
            const active = status === step;
            return (
              <li
                key={step}
                className={`admin-order-timeline__step${done ? " is-done" : ""}${active ? " is-active" : ""}`}
              >
                <span className="admin-order-timeline__dot" aria-hidden />
                <span className="admin-order-timeline__label">{orderStatusLabel(locale, step)}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className="admin-progress admin-progress--order">
        <div className="admin-progress__track">
          <div className="admin-progress__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="admin-progress__pct">{pct}%</span>
      </div>
    </div>
  );
}
