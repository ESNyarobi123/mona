import type { CustomerLocale } from "./customer-i18n";
import { orderStatusLabel } from "./customer-i18n";

export type TimelineStep = {
  id: string;
  label: string;
  state: "done" | "active" | "upcoming" | "cancelled";
};

const GROCERY_FLOW = ["PENDING", "CONFIRMED", "PREPARING", "ON_THE_WAY", "DELIVERED"] as const;
const RESTAURANT_FLOW = ["PENDING", "CONFIRMED", "PREPARING", "DELIVERED"] as const;

export function buildOrderTimeline(
  module: string,
  currentStatus: string,
  locale: CustomerLocale
): TimelineStep[] {
  if (currentStatus === "CANCELLED") {
    return [
      {
        id: "CANCELLED",
        label: orderStatusLabel(locale, "CANCELLED"),
        state: "cancelled",
      },
    ];
  }

  const flow: readonly string[] = module === "RESTAURANT" ? RESTAURANT_FLOW : GROCERY_FLOW;
  const currentIdx = Math.max(0, flow.indexOf(currentStatus));

  return flow.map((step, i) => {
    let state: TimelineStep["state"] = "upcoming";
    if (i < currentIdx) state = "done";
    else if (i === currentIdx) state = "active";
    return {
      id: step,
      label: orderStatusLabel(locale, step),
      state,
    };
  });
}

export function isOrderActive(status: string): boolean {
  return !["DELIVERED", "CANCELLED"].includes(status);
}
