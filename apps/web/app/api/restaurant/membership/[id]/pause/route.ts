import { pauseRestaurantMembershipSchema } from "@monana/types";
import { pauseRestaurantMembership } from "@monana/restaurant";
import { handle, ok, parseBody } from "../../../../../../lib/api";
import { requireAdmin } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/restaurant/membership/:id/pause
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const { weeks } = await parseBody(req, pauseRestaurantMembershipSchema);
    return ok(await pauseRestaurantMembership(id, weeks));
  });
}
