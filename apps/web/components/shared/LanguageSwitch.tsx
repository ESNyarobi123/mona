"use client";

import { useAppLocale } from "../providers/AppLocaleProvider";

type Props = {
  compact?: boolean;
};

export function LanguageSwitch({ compact }: Props) {
  const { locale, setLocale, t } = useAppLocale();

  function pick(next: "en" | "sw") {
    if (next !== locale) void setLocale(next);
  }

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
        onClick={() => pick("en")}
      >
        ENG
      </button>
      <button
        type="button"
        className={`lang-switch__btn ${locale === "sw" ? "lang-switch__btn--active" : ""}`}
        aria-pressed={locale === "sw"}
        onClick={() => pick("sw")}
      >
        SWA
      </button>
    </div>
  );
}
