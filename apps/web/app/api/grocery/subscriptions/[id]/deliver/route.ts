import { createSubscriptionPrepayOrder } from "@monana/grocery";
import { prisma } from "@monana/db";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — admin: tengeneza oda ya malipo ya mzunguko */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const sub = await prisma.grocerySubscription.findUnique({ where: { id } });
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    if (sub.status === "CANCELLED") throw new ApiError("Usajili umesitishwa", 400);
    return ok(
      await createSubscriptionPrepayOrder(id, { scheduledFor: new Date(), skipDuplicateCheck: true }),
      201
    );
  });
}
