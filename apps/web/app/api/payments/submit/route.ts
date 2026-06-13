import { submitPaymentSchema } from "@monana/types";
import { submitManualPayment, getPayment } from "@monana/payment";
import { notifyAdminPaymentSubmitted } from "../../../../lib/whatsapp";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError, getAuth, isBotChannel } from "../../../../lib/auth";

// POST /api/payments/submit { paymentId, reference }
export async function POST(req: Request) {
  return handle(async () => {
    const { paymentId, reference } = await parseBody(req, submitPaymentSchema);
    const full = await getPayment(paymentId);
    if (!full) throw new ApiError("Malipo hayapatikani", 404);

    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== full.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    const payment = await submitManualPayment(paymentId, reference);
    await notifyAdminPaymentSubmitted({
      orderId: payment.orderId,
      amount: Number(payment.amount),
      reference,
      customer: full.user ? { name: full.user.name, phone: full.user.phone } : null,
    });
    return ok({ payment });
  });
}
