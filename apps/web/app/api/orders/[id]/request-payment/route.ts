import { requestOrderPaymentSchema } from "@monana/types";
import { getOrderById } from "@monana/orders";
import { getPayment, requestPayOnDeliveryPayment } from "@monana/payment";
import { prisma } from "@monana/db";
import {
  notifyAdminPayOnDeliveryPaymentRequest,
} from "../../../../../lib/whatsapp";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, isBotChannel } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/orders/:id/request-payment — customer pays after receiving cargo
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(req, requestOrderPaymentSchema);
    const auth = getAuth(req);
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    const order = await getOrderById(id);
    if (!order) throw new ApiError("Oda haipatikani", 404);
    if (auth && auth.role !== "ADMIN" && auth.sub !== order.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }

    const payment = await requestPayOnDeliveryPayment(id, body.reference);
    const user = await prisma.user.findUnique({ where: { id: order.userId } });
    const full = await getPayment(payment.id);

    await notifyAdminPayOnDeliveryPaymentRequest({
      orderId: id,
      amount: Number(payment.amount),
      reference: body.reference,
      customer: user ? { name: user.name, phone: user.phone } : null,
    });

    return ok({ payment, orderId: id, order: full?.order });
  });
}
