import { getMarketRunById } from "@monana/grocery";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** GET — full run (procurement + packing + routes) */
export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const run = await getMarketRunById(id);
    if (!run) throw new ApiError("Ripoti haipatikani", 404);
    return ok(run);
  });
}
