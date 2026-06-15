import { getBotShowcase } from "../lib/bot-showcase";
import { getRestaurantSlotTicker } from "@monana/restaurant";
import { LandingPageView } from "../components/landing/LandingPageView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [botShowcase, restaurantTicker] = await Promise.all([
    getBotShowcase("en"),
    getRestaurantSlotTicker("en", new Date(), { applyLandingBoost: true }),
  ]);

  return <LandingPageView botShowcase={botShowcase} restaurantTicker={restaurantTicker} />;
}
