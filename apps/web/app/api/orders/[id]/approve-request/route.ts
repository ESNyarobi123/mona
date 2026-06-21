import { approvePayOnDeliveryRequest, getOrderById } from "@monana/orders";
import { notifyCustomerPayOnDeliveryApproved } from "@monana/notifications";
import { handle, ok } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — admin approves pay-on-delivery request */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const order = await approvePayOnDeliveryRequest(id);
    if (order.user?.phone) {
      await notifyCustomerPayOnDeliveryApproved({
        phone: order.user.phone,
        orderId: order.id,
      });
    }
    return ok(await getOrderById(id));
  });
}
