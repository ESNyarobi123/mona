import { enrollRestaurantMembershipSchema } from "@monana/types";
import {
  enrollRestaurantMembership,
  getRestaurantMembershipSetup,
  listRestaurantMemberships,
} from "@monana/restaurant";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireAdmin, requireSelfAdminOrBot } from "../../../../../lib/auth";

// GET /api/restaurant/store/membership?locale=&userId= | admin: ?all=1
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") === "sw" ? "sw" : "en";
    const userId = url.searchParams.get("userId");
    const all = url.searchParams.get("all") === "1";

    if (all) {
      requireAdmin(req);
      const subs = await listRestaurantMemberships();
      return ok(subs);
    }

    if (userId) {
      requireSelfAdminOrBot(req, userId);
      const subs = await listRestaurantMemberships({ userId });
      return ok(subs);
    }

    return ok(getRestaurantMembershipSetup(locale));
  });
}

// POST /api/restaurant/store/membership — enroll restaurant membership
export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, enrollRestaurantMembershipSchema);
    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== input.userId) {
      throw new ApiError("Huwezi kusajili kwa mtumiaji mwingine", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    const sub = await enrollRestaurantMembership(input);
    return ok(sub, 201);
  });
}
