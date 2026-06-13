import { orderStatusSchema } from "@monana/types";
import { getOrderById, updateOrderStatus, getAllowedNextStatuses } from "@monana/orders";
import { notifyCustomer } from "@monana/notifications";
import { z } from "zod";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireAdmin } from "../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

async function assertOrderAccess(req: Request, orderUserId: string) {
  const auth = getAuth(req);
  if (!auth) {
    if (isBotChannel(req)) return;
    throw new ApiError("Ingia kwanza", 401);
  }
  if (auth.role !== "ADMIN" && auth.sub !== orderUserId) {
    throw new ApiError("Huna ruhusa", 403);
  }
}

// GET /api/orders/:id — mteja (mwenyewe) au admin
export async function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) throw new ApiError("Oda haipatikani", 404);
    await assertOrderAccess(req, order.userId);
    return ok({
      ...order,
      allowedNextStatuses: getAllowedNextStatuses(order.module, order.status),
    });
  });
}

// PATCH /api/orders/:id { status } — admin
export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const { status } = await parseBody(req, z.object({ status: orderStatusSchema }));
    const order = await updateOrderStatus(id, status);

    const full = await getOrderById(id);
    if (full?.user?.phone) {
      await notifyCustomer(full.user.phone, `📦 Oda yako #${id.slice(-6)} sasa: ${status}`);
    }
    return ok(order);
  });
}
