import { updateCategorySchema } from "@monana/types";
import { updateCategory, deleteCategory } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateCategorySchema);
    return ok(await updateCategory(id, input));
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    await deleteCategory(id);
    return ok({ deleted: true });
  });
}
