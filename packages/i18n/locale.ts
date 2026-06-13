export const LOCALES = ["en", "sw"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";

export function parseLocale(value: string | null | undefined): AppLocale {
  if (value === "sw") return "sw";
  return "en";
}

export function otherLocale(locale: AppLocale): AppLocale {
  return locale === "en" ? "sw" : "en";
}
