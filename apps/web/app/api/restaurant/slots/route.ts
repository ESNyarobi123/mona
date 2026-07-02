import { parseLocale } from "@monana/i18n";
import { getMealSlotsPayload } from "@monana/restaurant";
import { handle, ok } from "../../../../lib/api";

/** GET /api/restaurant/slots — order windows + open/closed status */
export function GET(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    return ok(await getMealSlotsPayload(locale === "sw" ? "sw" : "en"));
  });
}
