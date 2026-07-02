import {
  getSubscriptionById,
  refreshSubscriptionPendingCheckout,
} from "@monana/grocery";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, getAuth } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — refresh checkout link for unpaid subscription */
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

    const payment = await refreshSubscriptionPendingCheckout(id, sub.userId);
    return ok(payment);
  });
}
