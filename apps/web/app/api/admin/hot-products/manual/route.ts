import { createHotPickSchema, reorderHotPicksSchema } from "@monana/types";
import { addManualPick, reorderManualPicks } from "@monana/hot-products";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

/** POST /api/admin/hot-products/manual — add a manual hot pick */
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, createHotPickSchema);
    const pick = await addManualPick(input);
    return ok(pick, 201);
  });
}

/** PUT /api/admin/hot-products/manual/reorder — reorder manual picks */
export function PUT(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, reorderHotPicksSchema);
    const picks = await reorderManualPicks(input.module, input.orderedIds);
    return ok(picks);
  });
}
