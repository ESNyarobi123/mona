"use client";

import { useAppLocale } from "../providers/AppLocaleProvider";

export function HowItWorks() {
  const { t } = useAppLocale();

  const steps = [
    { num: 1, title: t("how1Title"), text: t("how1Text") },
    { num: 2, title: t("how2Title"), text: t("how2Text") },
    { num: 3, title: t("how3Title"), text: t("how3Text") },
    { num: 4, title: t("how4Title"), text: t("how4Text") },
  ];

  return (
    <section className="landing-section" id="how-it-works">
      <h2 className="landing-section__title">{t("howTitle")}</h2>
      <p className="landing-section__subtitle">{t("howSub")}</p>

      <div className="landing-steps">
        {steps.map((s) => (
          <div key={s.num} className="landing-step">
            <div className="landing-step__num">{s.num}</div>
            <h4>{s.title}</h4>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
