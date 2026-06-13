import { processDueSubscriptions } from "@monana/grocery";
import { handle, ok } from "../../../../../lib/api";
import { requireCronOrAdmin } from "../../../../../lib/auth";

/** POST /api/grocery/subscriptions/run-due — generate orders for due subscriptions (cron/admin) */
export function POST(req: Request) {
  return handle(async () => {
    requireCronOrAdmin(req);
    return ok(await processDueSubscriptions());
  });
}
