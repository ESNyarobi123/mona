import { autoGenerateMarketRunIfDue, getMarketSettings, isMarketCutoffDue } from "@monana/grocery";
import { handle, ok } from "../../../../../../lib/api";
import { requireAdmin, requireCronOrAdmin } from "../../../../../../lib/auth";

/** POST — cron or admin: generate locked run when cutoff evening reached */
export function POST(req: Request) {
  return handle(async () => {
    requireCronOrAdmin(req);
    const result = await autoGenerateMarketRunIfDue();
    return ok(result, result.generated ? 201 : 200);
  });
}

/** GET — admin: check if auto-run is due now (for dashboard badge) */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const settings = await getMarketSettings();
    const check = isMarketCutoffDue(settings);
    return ok({ settings, ...check });
  });
}
