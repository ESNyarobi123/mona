import { getMarketRunById, updatePackingCheck } from "@monana/grocery";
import { updatePackingCheckSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../../../lib/auth";

type Params = { params: Promise<{ id: string; orderId: string }> };

/** PATCH — tick packing checklist lines for one order */
export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id, orderId } = await params;
    const body = await parseBody(req, updatePackingCheckSchema);
    const run = await getMarketRunById(id);
    if (!run) throw new ApiError("Ripoti haipatikani", 404);
    if (!run.includedOrderIds.includes(orderId)) {
      throw new ApiError("Oda haijumuishwi kwenye ripoti hii", 404);
    }
    return ok(await updatePackingCheck({ runId: id, orderId, lines: body.lines }));
  });
}
