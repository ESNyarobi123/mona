import { updateMenuItemSchema } from "@monana/types";
import { updateMenuItem, getMenuItemById, deleteMenuItem } from "@monana/restaurant";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const item = await getMenuItemById(id);
    if (!item) throw new ApiError("Kipengele hakipatikani", 404);
    return ok(item);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateMenuItemSchema);
    return ok(await updateMenuItem(id, input));
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    return ok(await deleteMenuItem(id));
  });
}
