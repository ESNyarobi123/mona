import type { AppLocale } from "@monana/i18n";
import { groceryRecurringDeliveryDays } from "./grocery-delivery";

export const DAY_OF_WEEK: Record<AppLocale, Record<number, string>> = {
  en: {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  },
  sw: {
    0: "Jumapili",
    1: "Jumatatu",
    2: "Jumanne",
    3: "Jumatano",
    4: "Alhamisi",
    5: "Ijumaa",
    6: "Jumamosi",
  },
};

/** @deprecated use DAY_OF_WEEK.sw */
export const DAY_OF_WEEK_SW = DAY_OF_WEEK.sw;

export const PACKAGE_KIND_LABEL: Record<
  AppLocale,
  Record<string, { title: string; description: string }>
> = {
  en: {
    WEEKLY_BASKET: {
      title: "Weekly Basket",
      description: "Fresh produce and essentials — delivered weekly on your chosen day",
    },
    MONTHLY_PANTRY: {
      title: "Monthly Pantry",
      description: "Staples like rice, oil, sugar — delivered 1–2 times per month",
    },
  },
  sw: {
    WEEKLY_BASKET: {
      title: "Kifurushi cha Wiki",
      description: "Mboga, matunda, mahitaji ya msingi — utoaji kila wiki siku maalum",
    },
    MONTHLY_PANTRY: {
      title: "Kifurushi cha Mwezi",
      description: "Nafaka, mafuta, sukari, viazi — utoaji mara 1 au 2 kwa mwezi",
    },
  },
};

export function packageKindLabel(kind: string, lang: AppLocale = "en") {
  return PACKAGE_KIND_LABEL[lang][kind] ?? { title: kind, description: "" };
}

export function dayOfWeekLabel(day: number, lang: AppLocale = "en") {
  return DAY_OF_WEEK[lang][day] ?? (lang === "sw" ? `Siku ${day}` : `Day ${day}`);
}

export const MEMBERSHIP_PLANS = {
  WEEKLY: {
    id: "WEEKLY" as const,
    title: { en: "Weekly Membership", sw: "Uanachama wa Kila Wiki" },
    label: { en: "Weekly", sw: "Kila Wiki" },
    discountPercent: 3,
    freeDelivery: false,
    requiresDayOfWeek: true,
  },
  MONTHLY: {
    id: "MONTHLY" as const,
    title: { en: "Monthly Membership", sw: "Uanachama wa Kila Mwezi" },
    label: { en: "Monthly", sw: "Kila Mwezi" },
    discountPercent: 5,
    freeDelivery: true,
    requiresDayOfMonth: true,
  },
};

export const MAX_MEMBERSHIP_DISCOUNT_PERCENT = 5;

/** Minimum different products in a grocery membership basket (discount / free delivery). */
export const MIN_GROCERY_MEMBERSHIP_DISTINCT_PRODUCTS = 12;

export function countDistinctBasketProducts(
  basket: { productId: string; quantity: number }[]
): number {
  return new Set(basket.filter((b) => b.quantity > 0).map((b) => b.productId)).size;
}

export function groceryMembershipBasketError(
  basket: { productId: string; quantity: number }[],
  locale: AppLocale = "en"
): string | null {
  const count = countDistinctBasketProducts(basket);
  if (count >= MIN_GROCERY_MEMBERSHIP_DISTINCT_PRODUCTS) return null;
  const min = MIN_GROCERY_MEMBERSHIP_DISTINCT_PRODUCTS;
  return locale === "sw"
    ? `Uanachama unahitaji angalau bidhaa ${min} tofauti kwenye kikapu (una ${count}). Nunua kwa oda ya kawaida ikiwa huna hivyo.`
    : `Membership requires at least ${min} different products in your basket (you have ${count}). Please shop on-demand instead.`;
}

export function assertGroceryMembershipBasketSize(
  basket: { productId: string; quantity: number }[],
  locale: AppLocale = "en"
): void {
  const message = groceryMembershipBasketError(basket, locale);
  if (message) throw new Error(message);
}

/** @deprecated use groceryRecurringDeliveryDays or getUpcomingGroceryDeliverySlots */
export function weeklyDeliveryDays(lang: AppLocale = "en") {
  return groceryRecurringDeliveryDays(lang);
}

/** @deprecated use weeklyDeliveryDays */
export const WEEKLY_DELIVERY_DAYS = weeklyDeliveryDays("sw");

export function membershipPlanTitle(plan: "WEEKLY" | "MONTHLY", lang: AppLocale = "en") {
  return MEMBERSHIP_PLANS[plan].title[lang];
}

export function frequencyLabel(frequency: string, lang: AppLocale = "en") {
  if (frequency === "WEEKLY") return lang === "sw" ? "Kila wiki" : "Weekly";
  if (frequency === "MONTHLY") return lang === "sw" ? "Kila mwezi" : "Monthly";
  return frequency;
}
