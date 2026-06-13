import { getPayment } from "@monana/payment";
import { handle, ok } from "../../../../lib/api";
import { ApiError, requireAdmin, requireSelfAdminOrBot } from "../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/payments/:id — mteja (mwenyewe) au admin
export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const payment = await getPayment(id);
    if (!payment) throw new ApiError("Malipo hayapatikani", 404);
    requireSelfAdminOrBot(req, payment.userId);
    return ok(payment);
  });
}
