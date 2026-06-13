"use client";

import { useAdminLocale } from "./AdminLocaleProvider";

type Props = {
  compact?: boolean;
};

export function AdminLanguageSwitch({ compact }: Props) {
  const { locale, setLocale, t } = useAdminLocale();

  return (
    <div
      className={`lang-switch ${compact ? "lang-switch--compact" : ""}`}
      role="group"
      aria-label={t("langLabel")}
    >
      <button
        type="button"
        className={`lang-switch__btn ${locale === "en" ? "lang-switch__btn--active" : ""}`}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        ENG
      </button>
      <button
        type="button"
        className={`lang-switch__btn ${locale === "sw" ? "lang-switch__btn--active" : ""}`}
        aria-pressed={locale === "sw"}
        onClick={() => setLocale("sw")}
      >
        SWA
      </button>
    </div>
  );
}
