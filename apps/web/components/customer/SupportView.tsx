"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/admin-api";
import { WhatsAppDirectLink } from "../shared/WhatsAppDirectLink";
import { useAppLocale } from "../providers/AppLocaleProvider";

type SupportInfo = {
  lipaNamba: string | null;
  lipaNambaName: string;
  whatsappUrl: string | null;
  phoneDisplay: string | null;
  botConnected: boolean;
};

const FAQ_KEYS = [
  { q: "faq1q" as const, a: "faq1a" as const },
  { q: "faq2q" as const, a: "faq2a" as const },
  { q: "faq3q" as const, a: "faq3a" as const },
  { q: "faq4q" as const, a: "faq4a" as const },
];

export function SupportView() {
  const { t } = useAppLocale();
  const [info, setInfo] = useState<SupportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    apiGet<SupportInfo>("/api/support")
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  async function copyLipa() {
    if (!info?.lipaNamba) return;
    try {
      await navigator.clipboard.writeText(info.lipaNamba);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="support-page">
      <header className="support-page__hero">
        <div className="support-page__hero-icon" aria-hidden>
          🆘
        </div>
        <div>
          <p className="support-page__eyebrow">{t("supportEyebrow")}</p>
          <h1 className="support-page__title">{t("supportTitle")}</h1>
          <p className="support-page__sub">{t("supportSub")}</p>
        </div>
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loading")}</p>
        </div>
      ) : (
        <div className="support-page__grid">
          <WhatsAppDirectLink className="support-card support-card--whatsapp">
            <span className="support-card__icon" aria-hidden>
              💬
            </span>
            <div>
              <h2>{t("navWhatsapp")}</h2>
              <p>
                {info?.phoneDisplay
                  ? `${t("chatWith")} ${info.phoneDisplay}`
                  : t("openWhatsappBot")}
              </p>
            </div>
          </WhatsAppDirectLink>

          {info?.lipaNamba ? (
            <div className="support-card support-card--lipa">
              <span className="support-card__icon" aria-hidden>
                💳
              </span>
              <div>
                <h2>Lipa Namba</h2>
                <p className="support-lipa__number">{info.lipaNamba}</p>
                <small>{info.lipaNambaName}</small>
              </div>
              <button type="button" className="landing-btn landing-btn--ghost" onClick={copyLipa}>
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
          ) : null}

          <section className="support-faq">
            <h2>FAQ</h2>
            <ul>
              {FAQ_KEYS.map((item, i) => (
                <li key={item.q} className="support-faq__item">
                  <button
                    type="button"
                    className="support-faq__q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {t(item.q)}
                  </button>
                  {openFaq === i ? <p className="support-faq__a">{t(item.a)}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="support-card support-card--links">
            <h2>{t("links")}</h2>
            <div className="support-links">
              <Link href="/account">{t("navOverview")}</Link>
              <Link href="/restaurant/orders">{t("navRestOrders")}</Link>
              <Link href="/grocery/orders">{t("navGrocOrders")}</Link>
              <Link href="/restaurant/slots">{t("slotsPageTitle")}</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
