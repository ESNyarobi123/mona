import { updateUnitSchema } from "@monana/types";
import { deleteUnit, getUnitById, updateUnit } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/units/[id]
// DELETE /api/admin/units/[id]
export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const existing = await getUnitById(id);
    if (!existing) throw new Error("Unit not found");
    const input = await parseBody(req, updateUnitSchema);
    return ok(await updateUnit(id, input));
  });
}

export function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(_req);
    const { id } = await params;
    await deleteUnit(id);
    return ok({ deleted: true });
  });
}
