import { getMarketSettings, updateMarketSettings } from "@monana/grocery";
import { updateMarketSettingsSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { requireAdmin } from "../../../../../../lib/auth";

/** GET/PATCH — auto-generate schedule (cutoff day/hour) */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return ok(await getMarketSettings());
  });
}

export function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, updateMarketSettingsSchema);
    return ok(await updateMarketSettings(input));
  });
}
