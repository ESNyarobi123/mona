import { getOverviewStats } from "@monana/admin";
import { handle, ok } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    return ok(await getOverviewStats());
  });
}
