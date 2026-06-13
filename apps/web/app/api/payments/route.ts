import { createPaymentSchema } from "@monana/types";
import { createPaymentRequest, listPayments } from "@monana/payment";
import { getPlatformSettings } from "@monana/settings";
import { formatTZS, parsePagination } from "@monana/utils";
import { parseLocale } from "@monana/i18n";
import { prisma } from "@monana/db";
import QRCode from "qrcode";
import { buildLipaNambaQrPayload } from "../../../lib/lipa-qr";
import { handle, ok, parseBody } from "../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireAdmin, requireSelfAdminOrBot } from "../../../lib/auth";

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

// POST /api/payments { orderId } — create Lipa Namba request
export async function POST(req: Request) {
  return handle(async () => {
    const { orderId } = await parseBody(req, createPaymentSchema);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new ApiError("Oda haipatikani", 404);

    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== order.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    const payment = await createPaymentRequest(orderId);
    const { lipaNamba, lipaNambaName } = await getPlatformSettings();
    const lipa = lipaNamba || "XXXXXXX";
    const lipaName = lipaNambaName || "MONANA";
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    const amount = formatTZS(Number(payment.amount));
    const steps =
      locale === "sw"
        ? `Lipa ${amount} kwa Lipa Namba ${lipa} (${lipaName}), kisha tuma reference.`
        : `Pay ${amount} to Lipa Namba ${lipa} (${lipaName}), then send your reference.`;

    const qrPayload = buildLipaNambaQrPayload(lipa);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 280, margin: 2, errorCorrectionLevel: "M" });

    return ok(
      {
        payment,
        instructions: {
          lipaNamba: lipa,
          name: lipaName,
          amount,
          reference: payment.reference,
          steps,
          qrPayload,
        },
        qrDataUrl,
      },
      201
    );
  });
}
