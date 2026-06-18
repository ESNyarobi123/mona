import { processRestaurantSlotReminders } from "@monana/restaurant";
import { handle, ok } from "../../../../../lib/api";
import { requireCronOrAdmin } from "../../../../../lib/auth";

/** POST /api/restaurant/membership/notify-slots — cron: remind members when meal windows open */
export async function POST(req: Request) {
  return handle(async () => {
    requireCronOrAdmin(req);
    return ok(await processRestaurantSlotReminders());
  });
}
