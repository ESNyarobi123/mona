"use client";

import Image from "next/image";
import Link from "next/link";
import { useAppLocale } from "../providers/AppLocaleProvider";

const HERO_FOOD = {
  main: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=85&auto=format&fit=crop",
  salad: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=85&auto=format&fit=crop",
  grocery: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=85&auto=format&fit=crop",
};

export function HeroSection() {
  const { locale, t } = useAppLocale();

  return (
    <section className="landing-hero">
      <div className="landing-hero__content">
        <div className="landing-hero__badge">
          <span>🛵</span> {t("heroBadge")}
        </div>

        <h1 className="landing-hero__title">
          {t("heroTitle")} <span>{t("heroTitleAccent")}</span>
        </h1>

        <p className="landing-hero__subtitle">{t("heroSub")}</p>

        <div className="landing-hero__ctas">
          <Link href="/grocery" className="landing-btn landing-btn--navy">
            {t("orderNow")}
          </Link>
          <Link href="#how-it-works" className="landing-btn landing-btn--ghost">
            <span className="landing-hero__play">▶</span>
            {t("howToOrder")}
          </Link>
        </div>

        <div className="landing-social-proof">
          <div className="landing-avatars" aria-hidden>
            <span className="landing-avatars__face landing-avatars__face--1">A</span>
            <span className="landing-avatars__face landing-avatars__face--2">M</span>
            <span className="landing-avatars__face landing-avatars__face--3">J</span>
          </div>
          <div className="landing-rating">
            <strong>⭐ 4.9</strong>
            <small>{t("happyCustomers")}</small>
          </div>
        </div>

        <div className="landing-hero__food-mobile" aria-hidden>
          <HeroFoodShowcase variant="compact" locale={locale} />
        </div>
      </div>

      <div className="landing-hero__visual" aria-hidden>
        <HeroFoodShowcase variant="full" locale={locale} />
      </div>
    </section>
  );
}

function HeroFoodShowcase({
  variant,
  locale,
}: {
  variant: "full" | "compact";
  locale: "en" | "sw";
}) {
  const { t } = useAppLocale();
  return (
    <div className={`landing-hero__showcase landing-hero__showcase--${variant}`}>
      <div className="landing-hero__showcase-glow" />
      <div className="landing-hero__showcase-ring" />

      <div className="landing-hero__main-img">
        <Image
          src={HERO_FOOD.main}
          alt="Fresh Monana meal"
          fill
          sizes={variant === "full" ? "(max-width: 768px) 90vw, 420px" : "100vw"}
          className="landing-hero__photo"
          priority
        />
        <div className="landing-hero__img-overlay" />
        <div className="landing-hero__img-badge">
          <span>🔥</span> {t("hotFresh")}
        </div>
      </div>

      <div className="landing-hero__thumb landing-hero__thumb--salad">
        <Image src={HERO_FOOD.salad} alt="" fill sizes="120px" className="landing-hero__photo" />
      </div>

      <div className="landing-hero__thumb landing-hero__thumb--grocery">
        <Image src={HERO_FOOD.grocery} alt="" fill sizes="120px" className="landing-hero__photo" />
      </div>

      {variant === "full" ? (
        <>
          <div className="landing-float-card landing-float-card--1">
            <span className="landing-float-card__emoji">🥗</span>
            <div>
              <strong>{t("navRestaurant")}</strong>
              <small>{t("heroMealTimes")}</small>
            </div>
          </div>

          <div className="landing-float-card landing-float-card--2">
            <span className="landing-float-card__emoji">🛒</span>
            <div>
              <strong>{t("navGrocery")}</strong>
              <small>{t("freshDaily")}</small>
            </div>
          </div>

          <div className="landing-offer-card">
            <span className="landing-offer-card__tag">{t("membershipTag")}</span>
            <h4>{t("weeklyBasket")}</h4>
            <div className="landing-offer-card__price">
              {t("save5")} <s>{t("fullPrice")}</s>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
