import { confirmPaymentSchema } from "@monana/types";
import { confirmPayment, failPayment, getPayment } from "@monana/payment";
import { activateSubscriptionAfterPayment } from "@monana/grocery";
import {
  notifyCustomerPaymentConfirmed,
  notifyCustomerPaymentRejected,
} from "../../../../lib/whatsapp";
import { z } from "zod";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

const bodySchema = confirmPaymentSchema.extend({
  action: z.enum(["confirm", "reject"]).default("confirm"),
});

// POST /api/payments/confirm { paymentId, action? } -> admin confirms/rejects
export async function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const { paymentId, action } = await parseBody(req, bodySchema);

    const payment =
      action === "reject" ? await failPayment(paymentId) : await confirmPayment(paymentId);

    if (action === "confirm") {
      await activateSubscriptionAfterPayment(payment.orderId);
    }

    const full = await getPayment(paymentId);
    if (full?.user?.phone) {
      if (action === "reject") {
        await notifyCustomerPaymentRejected({
          phone: full.user.phone,
          orderId: payment.orderId,
        });
      } else {
        await notifyCustomerPaymentConfirmed({
          phone: full.user.phone,
          orderId: payment.orderId,
        });
      }
    }
    return ok(payment);
  });
}
