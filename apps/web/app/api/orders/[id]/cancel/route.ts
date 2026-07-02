import { customerCancelRejectedPayOnDelivery } from "@monana/orders";
import { handle, ok } from "../../../../../lib/api";
import { ApiError, getAuth } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — customer cancels order after pay-on-delivery was rejected */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Ingia kwanza", 401);

    const { id } = await params;
    const order = await customerCancelRejectedPayOnDelivery(id, auth.sub);
    return ok(order);
  });
}
