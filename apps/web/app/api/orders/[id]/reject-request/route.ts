import { getOrderById, rejectPayOnDeliveryRequest } from "@monana/orders";
import { notifyCustomerPayOnDeliveryRejected } from "@monana/notifications";
import { handle, ok } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — admin rejects pay-on-delivery request */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const before = await getOrderById(id);
    const order = await rejectPayOnDeliveryRequest(id);
    if (before?.user?.phone) {
      await notifyCustomerPayOnDeliveryRejected({
        phone: before.user.phone,
        orderId: order.id,
      });
    }
    return ok(order);
  });
}
