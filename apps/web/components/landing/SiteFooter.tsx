"use client";

import Link from "next/link";
import { WhatsAppDirectLink } from "../shared/WhatsAppDirectLink";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { MonanaLogo } from "../brand/MonanaLogo";

export function SiteFooter() {
  const { t } = useAppLocale();

  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand-col">
          <Link href="/" className="landing-footer__brand">
            <MonanaLogo variant="full" height={40} />
          </Link>
          <p className="landing-footer__tagline">{t("footerTagline")}</p>
        </div>

        <div className="landing-footer__nav-grid">
          <div className="landing-footer__col">
            <h5 className="landing-footer__title">{t("footerShop")}</h5>
            <ul className="landing-footer__links">
              <li>
                <Link href="/restaurant">{t("navRestaurant")}</Link>
              </li>
              <li>
                <Link href="/grocery/products">{t("navGrocery")}</Link>
              </li>
              <li>
                <Link href="/grocery/packages">{t("footerMembership")}</Link>
              </li>
            </ul>
          </div>

          <div className="landing-footer__col">
            <h5 className="landing-footer__title">{t("footerAccountCol")}</h5>
            <ul className="landing-footer__links">
              <li>
                <Link href="/login">{t("login")}</Link>
              </li>
              <li>
                <Link href="/register">{t("footerRegister")}</Link>
              </li>
              <li>
                <Link href="/account">{t("footerMyOrders")}</Link>
              </li>
            </ul>
          </div>

          <div className="landing-footer__col landing-footer__col--support">
            <h5 className="landing-footer__title">{t("navSupport")}</h5>
            <ul className="landing-footer__links">
              <li>
                <Link href="/support">{t("footerHelp")}</Link>
              </li>
              <li>
                <WhatsAppDirectLink>{t("navWhatsapp")}</WhatsAppDirectLink>
              </li>
              <li>
                <Link href="/privacy">{t("footerPrivacy")}</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="landing-footer__bottom">
        © {new Date().getFullYear()} Monana. {t("footerCopy")}
      </div>
    </footer>
  );
}
