import { updateSubscriptionSchema } from "@monana/types";
import { getSubscriptionById, updateSubscription, cancelSubscription } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, requireAdmin, requireSelfAdminOrBot } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    requireSelfAdminOrBot(req, sub.userId);
    return ok(sub);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);

    const auth = getAuth(req);
    const isAdmin = auth?.role === "ADMIN";
    if (!isAdmin) {
      requireSelfAdminOrBot(req, sub.userId);
    }

    const input = await parseBody(req, updateSubscriptionSchema);

    if (!isAdmin) {
      if (input.nextRunAt !== undefined || input.packageId !== undefined) {
        throw new ApiError("Huwezi kubadilisha sehemu hii", 403);
      }
      if (input.preferredDayOfWeek !== undefined || input.preferredDayOfMonth !== undefined) {
        throw new ApiError("Wasiliana na admin kubadilisha ratiba", 403);
      }
      if (input.status === "ACTIVE" && sub.status === "CANCELLED") {
        throw new ApiError("Usajili umesitishwa — wasiliana na admin", 403);
      }
    }

    return ok(
      await updateSubscription(id, {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.nextRunAt !== undefined
          ? { nextRunAt: input.nextRunAt ? new Date(input.nextRunAt) : null }
          : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.packageId !== undefined ? { packageId: input.packageId } : {}),
        ...(input.preferredDayOfWeek !== undefined ? { preferredDayOfWeek: input.preferredDayOfWeek } : {}),
        ...(input.preferredDayOfMonth !== undefined ? { preferredDayOfMonth: input.preferredDayOfMonth } : {}),
        ...(input.secondaryDayOfMonth !== undefined ? { secondaryDayOfMonth: input.secondaryDayOfMonth } : {}),
      })
    );
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    return ok(await cancelSubscription(id));
  });
}
