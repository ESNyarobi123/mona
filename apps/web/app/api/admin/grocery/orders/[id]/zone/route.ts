import { assignOrderDeliveryZone } from "@monana/grocery";
import { assignOrderZoneSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../../../lib/api";
import { requireAdmin } from "../../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH — override delivery zone for route grouping */
export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, assignOrderZoneSchema);
    const order = await assignOrderDeliveryZone(id, input.deliveryZoneId);
    return ok(order);
  });
}
