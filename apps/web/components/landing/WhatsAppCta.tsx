"use client";

import { useAppLocale } from "../providers/AppLocaleProvider";

type Props = {
  phoneDisplay: string | null;
  whatsappUrl: string | null;
};

export function WhatsAppCta({ phoneDisplay, whatsappUrl }: Props) {
  const { t } = useAppLocale();

  const title = phoneDisplay
    ? t("waCtaTitle").replace("{phone}", phoneDisplay)
    : t("waCtaTitleFallback");

  return (
    <section className="landing-wa-cta">
      <div className="landing-wa-card">
        <div>
          <h3>{title}</h3>
          <p>{t("waCtaSub")}</p>
        </div>
        <a
          href={whatsappUrl ?? "#whatsapp-bot"}
          className="landing-btn"
          target={whatsappUrl ? "_blank" : undefined}
          rel={whatsappUrl ? "noopener noreferrer" : undefined}
        >
          {t("waCtaBtn")}
        </a>
      </div>
    </section>
  );
}
