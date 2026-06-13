import { updateSubscriptionBasketSchema } from "@monana/types";
import { updateSubscriptionBasket, getSubscriptionById } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { ApiError, requireSelfAdminOrBot } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH — hariri kikapu kabla ya siku ya kufunga order */
export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    requireSelfAdminOrBot(req, sub.userId);

    const input = await parseBody(req, updateSubscriptionBasketSchema);
    return ok(await updateSubscriptionBasket(id, input.items));
  });
}
