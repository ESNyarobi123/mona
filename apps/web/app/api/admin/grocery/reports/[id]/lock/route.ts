import { lockMarketRun } from "@monana/grocery";
import { handle, ok } from "../../../../../../../lib/api";
import { requireAdmin } from "../../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — lock run after order cutoff (no more regeneration) */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    return ok(await lockMarketRun(id));
  });
}
