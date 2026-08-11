import { updateRestaurantMembershipSchema } from "@monana/types";
import { getRestaurantMembershipById, updateRestaurantMembershipMealSlots } from "@monana/restaurant";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, requireSelfAdminOrBot } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/restaurant/membership/:id — member or admin updates meal slots
export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sub = await getRestaurantMembershipById(id);
    if (!sub) throw new ApiError("Uanachama haupatikani", 404);
    requireSelfAdminOrBot(req, sub.userId);

    const input = await parseBody(req, updateRestaurantMembershipSchema);
    return ok(await updateRestaurantMembershipMealSlots(id, input.mealSlots));
  });
}
