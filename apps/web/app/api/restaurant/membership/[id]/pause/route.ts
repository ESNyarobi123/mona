import { pauseRestaurantMembershipSchema } from "@monana/types";
import { pauseRestaurantMembership, getRestaurantMembershipById } from "@monana/restaurant";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { ApiError, requireSelfAdminOrBot } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/restaurant/membership/:id/pause — member or admin
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getRestaurantMembershipById(id);
    if (!sub) throw new ApiError("Uanachama haupatikani", 404);
    requireSelfAdminOrBot(req, sub.userId);

    const { weeks } = await parseBody(req, pauseRestaurantMembershipSchema);
    return ok(await pauseRestaurantMembership(id, weeks));
  });
}
