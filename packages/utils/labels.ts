import type { AppLocale } from "@monana/i18n";

/** Customer-facing labels (UI + bot). */
export const MODULE_LABELS: Record<
  AppLocale,
  Record<"RESTAURANT" | "GROCERY" | "CATERING", { title: string; subtitle: string; emoji: string }>
> = {
  en: {
    RESTAURANT: { title: "Restaurant", subtitle: "Meals", emoji: "🍲" },
    GROCERY: { title: "Grocery", subtitle: "Store", emoji: "🛒" },
    CATERING: { title: "Catering", subtitle: "Events", emoji: "🍽️" },
  },
  sw: {
    RESTAURANT: { title: "Restaurant", subtitle: "Chakula", emoji: "🍲" },
    GROCERY: { title: "Grocery", subtitle: "Soko", emoji: "🛒" },
    CATERING: { title: "Catering", subtitle: "Shughuli", emoji: "🍽️" },
  },
};

export function moduleLabel(
  module: "RESTAURANT" | "GROCERY" | "CATERING",
  lang: AppLocale = "en"
) {
  return MODULE_LABELS[lang][module];
}
