import {
  createDeliveryZone,
  listDeliveryZones,
  seedDefaultDeliveryZones,
} from "@monana/grocery";
import { deliveryZoneSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

/** GET — delivery zones · POST — create zone · POST ?seed=1 — default zones */
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const activeOnly = new URL(req.url).searchParams.get("active") === "1";
    return ok(await listDeliveryZones(activeOnly));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const url = new URL(req.url);
    if (url.searchParams.get("seed") === "1") {
      await seedDefaultDeliveryZones();
      return ok(await listDeliveryZones());
    }
    const input = await parseBody(req, deliveryZoneSchema);
    const zone = await createDeliveryZone(input);
    return ok(zone, 201);
  });
}
