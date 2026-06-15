"use client";

import Link from "next/link";
import { useAppLocale } from "../providers/AppLocaleProvider";

const SECTIONS = [
  { title: "privacyS1Title" as const, body: "privacyS1Body" as const },
  { title: "privacyS2Title" as const, body: "privacyS2Body" as const },
  { title: "privacyS3Title" as const, body: "privacyS3Body" as const },
  { title: "privacyS4Title" as const, body: "privacyS4Body" as const },
];

export function PrivacyPolicyView() {
  const { t } = useAppLocale();

  return (
    <div className="legal-page">
      <header className="legal-page__hero">
        <p className="legal-page__eyebrow">{t("privacyEyebrow")}</p>
        <h1 className="legal-page__title">{t("privacyTitle")}</h1>
        <p className="legal-page__meta">{t("privacyUpdated")}</p>
        <p className="legal-page__intro">{t("privacyIntro")}</p>
      </header>

      <div className="legal-page__sections">
        {SECTIONS.map((section) => (
          <section key={section.title} className="legal-page__section">
            <h2>{t(section.title)}</h2>
            <p>{t(section.body)}</p>
          </section>
        ))}
      </div>

      <p className="legal-page__back">
        <Link href="/support">{t("footerHelp")}</Link>
        {" · "}
        <Link href="/">{t("navHome")}</Link>
      </p>
    </div>
  );
}
