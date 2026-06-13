import { pauseSubscriptionSchema } from "@monana/types";
import { pauseSubscription, getSubscriptionById } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { ApiError, requireSelfAdminOrBot } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — sitisha usajili kwa muda (safari, wiki hiyo, n.k.) */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getSubscriptionById(id);
    if (!sub) throw new ApiError("Usajili haupatikani", 404);
    requireSelfAdminOrBot(req, sub.userId);

    const input = await parseBody(req, pauseSubscriptionSchema);
    if (!input.weeks && !input.until) {
      throw new ApiError("Taja weeks au until", 400);
    }

    return ok(
      await pauseSubscription(id, {
        weeks: input.weeks,
        until: input.until ? new Date(input.until) : undefined,
      })
    );
  });
}
