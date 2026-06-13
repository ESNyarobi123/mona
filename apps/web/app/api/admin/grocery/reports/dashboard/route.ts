import { getReportsDashboard } from "@monana/grocery";
import { deliveryDateSchema } from "@monana/types";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../lib/auth";

/** GET /api/admin/grocery/reports/dashboard?deliveryDate=YYYY-MM-DD */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const date = new URL(req.url).searchParams.get("deliveryDate");
    if (!date) throw new ApiError("deliveryDate inahitajika", 400);
    deliveryDateSchema.parse(date);
    return ok(await getReportsDashboard(date));
  });
}
