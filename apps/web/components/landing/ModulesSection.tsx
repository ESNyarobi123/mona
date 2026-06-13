"use client";

import Link from "next/link";
import { useAppLocale } from "../providers/AppLocaleProvider";

const MODULE_IDS = ["restaurant", "grocery"] as const;

export function ModulesSection() {
  const { t } = useAppLocale();

  const modules = [
    {
      id: "restaurant" as const,
      emoji: "🍲",
      title: t("modRestTitle"),
      description: t("modRestDesc"),
      tags: [t("tagBreakfast"), t("tagLunch"), t("tagDinner"), t("tagSameDay")],
      href: "/restaurant",
      cta: t("modRestCta"),
      btnClass: "landing-btn--navy",
      className: "",
    },
    {
      id: "grocery" as const,
      emoji: "🛒",
      title: t("modGrocTitle"),
      description: t("modGrocDesc"),
      tags: [t("tagOnDemand"), t("tagWeeklyBasket"), t("tagSave5Pct"), t("tagFreeDelivery")],
      href: "/grocery",
      cta: t("modGrocCta"),
      btnClass: "landing-btn--orange",
      className: "landing-module-card--grocery",
    },
  ];

  return (
    <section className="landing-section" id="services">
      <h2 className="landing-section__title">{t("modulesTitle")}</h2>
      <p className="landing-section__subtitle">{t("modulesSub")}</p>

      <div className="landing-modules">
        {modules.map((m) => (
          <article key={m.id} className={`landing-module-card ${m.className}`}>
            <div className="landing-module-card__emoji">{m.emoji}</div>
            <h3>{m.title}</h3>
            <p>{m.description}</p>
            <div className="landing-module-card__tags">
              {m.tags.map((tag) => (
                <span key={tag} className={`landing-tag ${m.id === "grocery" ? "landing-tag--navy" : ""}`}>
                  {tag}
                </span>
              ))}
            </div>
            <Link href={m.href} className={`landing-btn ${m.btnClass}`}>
              {m.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
