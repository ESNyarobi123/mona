import {
  getMealSlotSettingsPayload,
  updateMealSlotWindows,
} from "@monana/restaurant";
import { updateMealSlotWindowsSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { requireAdmin } from "../../../../../../lib/auth";

/** GET/PATCH /api/admin/restaurant/slots/settings — order window times */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return ok(await getMealSlotSettingsPayload());
  });
}

export function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, updateMealSlotWindowsSchema);
    const windows = await updateMealSlotWindows(input.windows);
    return ok({ windows, timezone: "Africa/Dar_es_Salaam" });
  });
}
