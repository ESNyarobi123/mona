import {
  cancelCustomOrder,
  getCustomOrderById,
  updateCustomOrderStatus,
} from "@monana/restaurant";
import { updateCustomOrderSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, requireAdmin, requireAuth } from "../../../../../lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const order = await getCustomOrderById(id);
    if (!order) throw new ApiError("Social Order haipatikani", 404);

    const auth = getAuth(req);
    if (!auth) throw new ApiError("Ingia kwanza", 401);
    if (auth.role !== "ADMIN" && auth.sub !== order.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }

    return ok(order);
  });
}

export function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    const input = await parseBody(req, updateCustomOrderSchema);
    return ok(
      await updateCustomOrderStatus(id, {
        status: input.status,
        quotedPrice: input.quotedPrice,
        adminNote: input.adminNote,
      })
    );
  });
}

export function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    const auth = requireAuth(req);
    const { id } = await ctx.params;
    return ok(await cancelCustomOrder(id, auth.sub));
  });
}
