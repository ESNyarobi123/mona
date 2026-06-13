import { deleteDeliveryZone, getDeliveryZoneById, updateDeliveryZone } from "@monana/grocery";
import { updateDeliveryZoneSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const zone = await getDeliveryZoneById(id);
    if (!zone) throw new ApiError("Eneo halipatikani", 404);
    return ok(zone);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateDeliveryZoneSchema);
    return ok(await updateDeliveryZone(id, input));
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    await deleteDeliveryZone(id);
    return ok({ deleted: true });
  });
}
