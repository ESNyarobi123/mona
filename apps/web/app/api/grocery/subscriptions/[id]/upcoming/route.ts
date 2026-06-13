import { getUpcomingDelivery, getSubscriptionById } from "@monana/grocery";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, requireSelfAdminOrBot } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** GET — utoaji ujao, cutoff, je unaweza kuhariri kikapu */
export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    requireSelfAdminOrBot(req, sub.userId);
    return ok(await getUpcomingDelivery(id));
  });
}
