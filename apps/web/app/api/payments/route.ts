import { createPaymentSchema } from "@monana/types";
import { createPaymentRequest, listPayments } from "@monana/payment";
import { getCheckoutIntent } from "@monana/orders";
import { parsePagination } from "@monana/utils";
import { prisma } from "@monana/db";
import { buildLipaPaymentInstructions } from "../../../lib/payment-instructions";
import { handle, ok, parseBody } from "../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireAdmin } from "../../../lib/auth";

// GET /api/payments — admin (paginated)
export async function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as
      | Parameters<typeof listPayments>[0]
      | null;
    const pagination = parsePagination(url.searchParams);
    const q = url.searchParams.get("q") ?? undefined;
    return ok(
      await listPayments(status ?? undefined, {
        page: pagination.page,
        limit: pagination.limit,
        q,
      })
    );
  });
}

// POST /api/payments { orderId | intentId } — Lipa Namba instructions
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseBody(req, createPaymentSchema);
    const locale = new URL(req.url).searchParams.get("locale");
    const auth = getAuth(req);
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    if (body.intentId) {
      const intent = await getCheckoutIntent(body.intentId);
      if (!intent) throw new ApiError("Checkout haipatikani", 404);
      if (intent.consumedAt) throw new ApiError("Malipo tayari yamewasilishwa", 409);
      if (intent.expiresAt <= new Date()) {
        throw new ApiError("Muda wa malipo umepita. Tengeneza oda mpya.", 410);
      }
      if (auth && auth.role !== "ADMIN" && auth.sub !== intent.userId) {
        throw new ApiError("Huna ruhusa", 403);
      }

      const { instructions, qrDataUrl } = await buildLipaPaymentInstructions(
        Number(intent.total),
        intent.paymentToken,
        locale
      );

      return ok(
        {
          kind: "CHECKOUT_INTENT" as const,
          intentId: intent.id,
          payment: {
            id: intent.id,
            status: "PENDING",
            reference: intent.paymentToken,
            amount: intent.total,
          },
          instructions,
          qrDataUrl,
        },
        201
      );
    }

    const orderId = body.orderId!;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new ApiError("Oda haipatikani", 404);

    if (auth && auth.role !== "ADMIN" && auth.sub !== order.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }

    if (order.status === "CANCELLED") {
      throw new ApiError("Oda hii ilifutwa", 409);
    }

    if (
      order.paymentTiming === "PAY_ON_DELIVERY" &&
      !["ON_THE_WAY", "DELIVERED"].includes(order.status)
    ) {
      throw new ApiError("Omba kulipia baada ya kupokea mzigo wako", 409);
    }

    const payment = await createPaymentRequest(orderId);
    const { instructions, qrDataUrl } = await buildLipaPaymentInstructions(
      Number(payment.amount),
      payment.reference ?? "",
      locale
    );

    return ok(
      {
        kind: "ORDER" as const,
        payment,
        instructions,
        qrDataUrl,
      },
      201
    );
  });
}
