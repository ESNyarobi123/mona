import { parseLocale } from "@monana/i18n";
import { getRestaurantSlotTicker } from "@monana/restaurant";
import { handle, ok } from "../../../../../lib/api";

/** GET /api/restaurant/slots/status — live meal-slot open/closed + today's order counts */
export function GET(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    const data = await getRestaurantSlotTicker(locale === "sw" ? "sw" : "en");
    return ok(data);
  });
}
