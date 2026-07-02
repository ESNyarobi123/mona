import { cancelRestaurantMembership, getRestaurantMembershipById } from "@monana/restaurant";
import { handle, ok } from "../../../../../../lib/api";
import { ApiError, getAuth } from "../../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

/** POST — customer leaves restaurant membership */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Ingia kwanza", 401);

    const { id } = await params;
    const sub = await getRestaurantMembershipById(id);
    if (!sub) throw new ApiError("Uanachama haupatikani", 404);
    if (auth.role !== "ADMIN" && auth.sub !== sub.userId) {
      throw new ApiError("Huna ruhusa", 403);
    }
    if (sub.status === "CANCELLED") {
      throw new ApiError("Uanachama huu tayari umeondolewa", 409);
    }

    return ok(await cancelRestaurantMembership(id));
  });
}
