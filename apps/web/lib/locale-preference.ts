import { DEFAULT_LOCALE, parseLocale, type AppLocale } from "@monana/i18n";

export const LOCALE_STORAGE_KEY = "monana_locale";
export const LOCALE_CHANGE_EVENT = "monana-locale";

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }));
}

export function syncLocaleToServer(userId: string, locale: AppLocale, token: string) {
  return fetch("/api/auth/locale", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, locale }),
  });
}
