import type { AppLocale } from "@monana/i18n";
import { UI_MESSAGES, type UiMessageKey } from "./i18n-messages";

export type CustomerLocale = AppLocale;
export type CustomerMessageKey = UiMessageKey;

export function t(locale: CustomerLocale, key: UiMessageKey): string {
  return UI_MESSAGES[key][locale];
}

/** @deprecated use t() — kept for restaurant slot helpers */
export type RestaurantMessageKey = UiMessageKey;
export function tr(locale: CustomerLocale, key: UiMessageKey): string {
  return t(locale, key);
}

/** @deprecated use t() — kept for landing imports */
export type LandingMessageKey = UiMessageKey;
export function lt(locale: CustomerLocale, key: UiMessageKey): string {
  return t(locale, key);
}

export const ORDER_STATUS_I18N: Record<string, { en: string; sw: string }> = {
  PENDING: { en: "Pending", sw: "Inasubiri" },
  CONFIRMED: { en: "Confirmed", sw: "Imethibitishwa" },
  PREPARING: { en: "Preparing", sw: "Inatayarishwa" },
  ON_THE_WAY: { en: "On the way", sw: "Njiani" },
  DELIVERED: { en: "Delivered", sw: "Imewasilishwa" },
  CANCELLED: { en: "Cancelled", sw: "Imefutwa" },
};

export const SUB_STATUS_I18N: Record<string, { en: string; sw: string }> = {
  ACTIVE: { en: "Active", sw: "Inaendelea" },
  PAUSED: { en: "Paused", sw: "Imesitishwa" },
  PENDING_PAYMENT: { en: "Awaiting payment", sw: "Inasubiri malipo" },
  CANCELLED: { en: "Cancelled", sw: "Imefutwa" },
};

export function orderStatusLabel(locale: CustomerLocale, status: string): string {
  return ORDER_STATUS_I18N[status]?.[locale] ?? status.replace(/_/g, " ");
}

export const SLOT_I18N: Record<string, { en: string; sw: string }> = {
  BREAKFAST: { en: "Breakfast", sw: "Asubuhi" },
  LUNCH: { en: "Lunch", sw: "Mchana" },
  DINNER: { en: "Dinner", sw: "Usiku" },
};

export function slotLabel(locale: CustomerLocale, slot: string): string {
  return SLOT_I18N[slot]?.[locale] ?? slot;
}

export function slotStatusLabel(locale: CustomerLocale, status: "OPEN" | "CLOSED"): string {
  return status === "OPEN" ? t(locale, "slotOpen") : t(locale, "slotClosed");
}

/** Restaurant messages alias — all keys live in UI_MESSAGES */
export const restaurantMessages = UI_MESSAGES;
