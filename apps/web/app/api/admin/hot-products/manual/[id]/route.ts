import { updateHotPickSchema } from "@monana/types";
import { updateManualPick, deleteManualPick } from "@monana/hot-products";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { requireAdmin } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/hot-products/manual/:id */
export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateHotPickSchema);
    return ok(await updateManualPick(id, input));
  });
}

/** DELETE /api/admin/hot-products/manual/:id */
export async function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    await deleteManualPick(id);
    return ok({ deleted: true });
  });
}
