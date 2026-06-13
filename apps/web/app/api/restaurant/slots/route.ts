import { parseLocale } from "@monana/i18n";
import { getMealSlotDefinitions } from "@monana/restaurant";
import { handle, ok } from "../../../../lib/api";

/** GET /api/restaurant/slots — order windows + open/closed status */
export function GET(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    return ok(getMealSlotDefinitions(locale === "sw" ? "sw" : "en"));
  });
}
