import { submitPaymentSchema } from "@monana/types";
import { submitManualPayment, getPayment } from "@monana/payment";
import { fulfillCheckoutIntent, getCheckoutIntent } from "@monana/orders";
import { prisma } from "@monana/db";
import {
  notifyAdminNewOrder,
  notifyAdminPaymentSubmitted,
  notifyAdminPayOnDeliveryPaymentRequest,
  notifyCustomerOrderReceived,
} from "../../../../lib/whatsapp";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError, getAuth, isBotChannel } from "../../../../lib/auth";

// POST /api/payments/submit — customer M-Pesa reference → create Order + Payment
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseBody(req, submitPaymentSchema);
    const auth = getAuth(req);
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    if (body.intentId) {
      const intent = await getCheckoutIntent(body.intentId);
      if (!intent) throw new ApiError("Checkout haipatikani", 404);
      if (auth && auth.role !== "ADMIN" && auth.sub !== intent.userId) {
        throw new ApiError("Huna ruhusa", 403);
      }

      const { order, payment } = await fulfillCheckoutIntent(body.intentId, body.reference);
      const user = await prisma.user.findUnique({ where: { id: order.userId } });

      if (user) {
        await notifyAdminNewOrder({
          id: order.id,
          module: order.module,
          channel: order.channel,
          total: Number(order.total),
          address: order.address,
          note: order.note,
          mealSlot: order.mealSlot,
          customer: user,
          items: order.items.map((i) => ({
            name: i.name,
            quantity: Number(i.quantity),
            price: Number(i.price),
          })),
        });
        await notifyAdminPaymentSubmitted({
          orderId: order.id,
          amount: Number(payment.amount),
          reference: body.reference,
          customer: { name: user.name, phone: user.phone },
        });
        if (user.phone) {
          await notifyCustomerOrderReceived({
            phone: user.phone,
            orderId: order.id,
            total: Number(order.total),
          });
        }
      }

      return ok({ payment, orderId: order.id, order });
    }

    const paymentId = body.paymentId!;
    const full = await getPayment(paymentId);
    if (!full) throw new ApiError("Malipo hayapatikani", 404);

    if (auth && auth.role !== "ADMIN" && auth.sub !== full.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }

    const payment = await submitManualPayment(paymentId, body.reference);
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    const notify =
      order?.paymentTiming === "PAY_ON_DELIVERY" && !order.submittedAt
        ? notifyAdminPayOnDeliveryPaymentRequest
        : notifyAdminPaymentSubmitted;
    await notify({
      orderId: payment.orderId,
      amount: Number(payment.amount),
      reference: body.reference,
      customer: full.user ? { name: full.user.name, phone: full.user.phone } : null,
    });
    return ok({ payment, orderId: payment.orderId });
  });
}
