import { z } from "zod";
import { listKitchenQueue, updateKitchenStatus } from "@monana/restaurant";
import { mealSlotSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const slot = new URL(req.url).searchParams.get("slot");
    const mealSlot = slot ? mealSlotSchema.parse(slot) : undefined;
    return ok(await listKitchenQueue(mealSlot));
  });
}

const patchSchema = z.object({
  queueId: z.string().min(1),
  status: z.enum(["WAITING", "COOKING", "READY", "SERVED"]),
});

export function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const { queueId, status } = await parseBody(req, patchSchema);
    return ok(await updateKitchenStatus(queueId, status));
  });
}
