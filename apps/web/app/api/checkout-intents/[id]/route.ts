import { getCheckoutIntent } from "@monana/orders";
import { handle, ok } from "../../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireSelfAdminOrBot } from "../../../../lib/auth";

// GET /api/checkout-intents/:id — payment page before order exists in DB
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const intent = await getCheckoutIntent(id);
    if (!intent) throw new ApiError("Checkout haipatikani", 404);

    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== intent.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }
    requireSelfAdminOrBot(req, intent.userId);

    if (intent.consumedAt && intent.orderId) {
      throw new ApiError("Malipo tayari yamewasilishwa — angalia oda zako", 409);
    }
    if (intent.expiresAt <= new Date()) {
      throw new ApiError("Muda wa malipo umepita. Tengeneza oda mpya.", 410);
    }

    return ok({
      id: intent.id,
      kind: "CHECKOUT_INTENT" as const,
      module: intent.module,
      total: intent.total,
      status: "AWAITING_PAYMENT",
      paymentToken: intent.paymentToken,
      expiresAt: intent.expiresAt,
    });
  });
}
