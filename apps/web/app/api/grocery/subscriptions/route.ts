import { createSubscriptionSchema } from "@monana/types";
import { enrollSubscription, listUserSubscriptions, listAllSubscriptions, listSubscriptionsPaginated } from "@monana/grocery";
import { parsePagination } from "@monana/utils";
import { handle, ok, parseBody } from "../../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireAdmin, requireSelfAdminOrBot } from "../../../../lib/auth";

export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    if (url.searchParams.get("all") === "1") {
      requireAdmin(req);
      const pagination = parsePagination(url.searchParams);
      const status = url.searchParams.get("status") as "ACTIVE" | "PAUSED" | "CANCELLED" | null;
      if (url.searchParams.get("page") || url.searchParams.get("limit")) {
        return ok(
          await listSubscriptionsPaginated({
            page: pagination.page,
            limit: pagination.limit,
            status: status ?? undefined,
          })
        );
      }
      return ok(await listAllSubscriptions(status ?? undefined));
    }
    const userId = url.searchParams.get("userId");
    if (!userId) throw new Error("userId inahitajika au tumia ?all=1 (admin)");
    requireSelfAdminOrBot(req, userId);
    return ok(await listUserSubscriptions(userId));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, createSubscriptionSchema);
    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== input.userId) {
      throw new ApiError("Huwezi kusajili kwa mtumiaji mwingine", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza au tumia channel ya WhatsApp", 401);
    }
    requireSelfAdminOrBot(req, input.userId);

    const result = await enrollSubscription(input);
    return ok(result, 201);
  });
}
