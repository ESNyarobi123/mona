import { cancelSubscription, getSubscriptionById } from "@monana/grocery";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, getAuth } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — customer-safe cancel for ACTIVE/PAUSED subscriptions */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Ingia kwanza", 401);

    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    if (auth.role !== "ADMIN" && auth.sub !== sub.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }
    if (sub.status === "PENDING_PAYMENT") {
      throw new ApiError("Tumia cancel pending kwa usajili unaosubiri malipo", 409);
    }
    if (sub.status === "CANCELLED") {
      throw new ApiError("Usajili huu tayari umesitishwa", 409);
    }

    return ok(await cancelSubscription(id));
  });
}
