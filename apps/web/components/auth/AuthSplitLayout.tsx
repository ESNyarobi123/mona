"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitch } from "../shared/LanguageSwitch";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { MonanaLogo } from "../brand/MonanaLogo";

const AUTH_HERO =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85&auto=format&fit=crop";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  const { t } = useAppLocale();

  return (
    <div className="auth-split">
      <aside className="auth-split__visual" aria-hidden>
        <Image src={AUTH_HERO} alt="" fill className="auth-split__photo" priority sizes="50vw" />
        <div className="auth-split__overlay" />
        <div className="auth-split__visual-content">
          <Link href="/" className="auth-split__brand">
            <MonanaLogo variant="mark" height={44} priority />
            <span className="auth-split__brand-name">Monana</span>
          </Link>
          <h2 className="auth-split__tagline">
            {t("authTagline")} <span>{t("authTaglineAccent")}</span>
          </h2>
          <p className="auth-split__desc">{t("authDesc")}</p>
          <div className="auth-split__chips">
            <span>{t("authChipRest")}</span>
            <span>{t("authChipGroc")}</span>
            <span>{t("authChipWa")}</span>
          </div>
          <div className="auth-split__proof">
            <span>⭐ 4.9</span>
            <small>{t("happyCustomers")}</small>
          </div>
        </div>
      </aside>

      <div className="auth-split__panel">
        <div className="auth-split__panel-top">
          <Link href="/" className="auth-split__home-link">
            {t("backToHome")}
          </Link>
          <LanguageSwitch compact />
        </div>
        <div className="auth-split__form-wrap">{children}</div>
      </div>
    </div>
  );
}

export function AuthPageLoading() {
  const { t } = useAppLocale();

  return (
    <div className="auth-split auth-split--loading">
      <div className="auth-split__panel">
        <div className="auth-form">{t("loading")}</div>
      </div>
    </div>
  );
}
