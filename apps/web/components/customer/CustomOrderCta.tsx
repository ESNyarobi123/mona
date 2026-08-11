"use client";

import Link from "next/link";
import { useAppLocale } from "../providers/AppLocaleProvider";

export function CustomOrderCta({ compact = false }: { compact?: boolean }) {
  const { t } = useAppLocale();

  return (
    <section
      className={`custom-order-cta${compact ? " custom-order-cta--compact" : ""}`}
      aria-label={t("customOrderPageTitle")}
    >
      <div className="custom-order-cta__copy">
        <p className="custom-order-cta__eyebrow">{t("customOrderPageTitle")}</p>
        <h2 className="custom-order-cta__title">{t("customOrderCtaTitle")}</h2>
        {!compact ? <p className="custom-order-cta__sub">{t("customOrderCtaSub")}</p> : null}
      </div>
      <Link href="/restaurant/social-order" className="landing-btn landing-btn--orange custom-order-cta__btn">
        {t("customOrderCtaButton")}
      </Link>
    </section>
  );
}
