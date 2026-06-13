"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "./HeroSection";
import { RestaurantOrderTicker } from "./RestaurantOrderTicker";
import { ModulesSection } from "./ModulesSection";
import { BotShowcaseView } from "./BotShowcaseView";
import { HowItWorks } from "./HowItWorks";
import { WhatsAppCta } from "./WhatsAppCta";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { useAppLocale } from "../providers/AppLocaleProvider";
import type { RestaurantSlotTickerData } from "@monana/restaurant";
import type { BotShowcaseData } from "../../lib/bot-showcase";

type Props = {
  botShowcase: BotShowcaseData;
  restaurantTicker: RestaurantSlotTickerData;
};

export function LandingPageView({ botShowcase: initialBotShowcase, restaurantTicker }: Props) {
  const { locale } = useAppLocale();
  const [botShowcase, setBotShowcase] = useState(initialBotShowcase);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bot/showcase?locale=${locale}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && json.data) setBotShowcase(json.data);
      })
      .catch(() => {
        /* keep last good data */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <div className="landing">
      <SiteHeader />
      <main>
        <HeroSection />
        <RestaurantOrderTicker initial={restaurantTicker} locale={locale} />
        <ModulesSection />
        <BotShowcaseView data={botShowcase} />
        <HowItWorks />
        <WhatsAppCta phoneDisplay={botShowcase.phoneDisplay} whatsappUrl={botShowcase.whatsappUrl} />
      </main>
      <SiteFooter />
    </div>
  );
}
