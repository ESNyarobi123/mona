import { parseLocale } from "@monana/i18n";
import { getRestaurantSlotTicker } from "@monana/restaurant";
import { handle, ok } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

/** GET /api/restaurant/slots/status — live meal-slot open/closed + today's order counts */
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const locale = parseLocale(url.searchParams.get("locale"));
    const realOnly = url.searchParams.get("realCounts") === "1";
    const landingBoost = url.searchParams.get("landingBoost") === "1";
    if (realOnly) requireAdmin(req);

    const data = await getRestaurantSlotTicker(locale === "sw" ? "sw" : "en", new Date(), {
      applyLandingBoost: landingBoost && !realOnly,
    });
    return ok(data);
  });
}
