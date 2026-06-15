import { landingTickerSettingsSchema } from "@monana/types";
import {
  getLandingTickerSettings,
  updateLandingTickerSettings,
} from "@monana/settings";
import { getRestaurantSlotTicker } from "@monana/restaurant";
import { parseLocale } from "@monana/i18n";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

/** GET /api/admin/landing — landing page ticker settings + live preview */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    const [settings, ticker] = await Promise.all([
      getLandingTickerSettings(),
      getRestaurantSlotTicker(locale === "sw" ? "sw" : "en", new Date(), {
        applyLandingBoost: true,
        includeBreakdown: true,
      }),
    ]);
    return ok({ settings, ticker });
  });
}

/** PATCH /api/admin/landing — update landing ticker boost / visibility */
export function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, landingTickerSettingsSchema);
    const settings = await updateLandingTickerSettings(input);
    return ok(settings);
  });
}
