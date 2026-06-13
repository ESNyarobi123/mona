import type { AppLocale } from "@monana/i18n";

/** Customer-facing labels (UI + bot). Backend module stays RESTAURANT | GROCERY. */
export const MODULE_LABELS: Record<
  AppLocale,
  Record<"RESTAURANT" | "GROCERY", { title: string; subtitle: string; emoji: string }>
> = {
  en: {
    RESTAURANT: { title: "Restaurant", subtitle: "Meals", emoji: "🍲" },
    GROCERY: { title: "Grocery", subtitle: "Store", emoji: "🛒" },
  },
  sw: {
    RESTAURANT: { title: "Restaurant", subtitle: "Chakula", emoji: "🍲" },
    GROCERY: { title: "Grocery", subtitle: "Soko", emoji: "🛒" },
  },
};

export function moduleLabel(module: "RESTAURANT" | "GROCERY", lang: AppLocale = "en") {
  return MODULE_LABELS[lang][module];
}
