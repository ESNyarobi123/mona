import {
  cancelCateringRequest,
  getCateringRequestById,
  updateCateringRequestStatus,
} from "@monana/catering";
import { cateringRequestStatusSchema } from "@monana/types";
import { z } from "zod";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, requireAdmin, requireAuth } from "../../../../../lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: cateringRequestStatusSchema,
});

export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const row = await getCateringRequestById(id);
    if (!row) throw new ApiError("Ombi la catering halipatikani", 404);
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Ingia kwanza", 401);
    if (auth.role !== "ADMIN" && auth.sub !== row.userId) throw new ApiError("Huna ruhusa", 403);
    return ok(row);
  });
}

export function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    const input = await parseBody(req, patchSchema);
    return ok(await updateCateringRequestStatus(id, input.status));
  });
}

export function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    const auth = requireAuth(req);
    const { id } = await ctx.params;
    return ok(await cancelCateringRequest(id, auth.sub));
  });
}
