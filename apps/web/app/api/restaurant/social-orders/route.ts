import {
  createCustomOrder,
  customOrderLeadTimeInfo,
  listCustomOrders,
  listUserCustomOrders,
} from "@monana/restaurant";
import { createCustomOrderSchema } from "@monana/types";
import { parsePagination } from "@monana/utils";
import { prisma } from "@monana/db";
import { handle, ok, parseBody } from "../../../../lib/api";
import {
  ApiError,
  getAuth,
  isBotChannel,
  requireAdmin,
  requireSelfAdminOrBot,
} from "../../../../lib/auth";
import { notifyAdminCustomOrder } from "../../../../lib/whatsapp";

// GET /api/restaurant/social-orders?userId= | admin list | ?meta=lead-time
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    if (url.searchParams.get("meta") === "lead-time") {
      return ok(customOrderLeadTimeInfo());
    }

    const pagination = parsePagination(url.searchParams);
    const userId = url.searchParams.get("userId");

    if (userId) {
      requireSelfAdminOrBot(req, userId);
      return ok(await listUserCustomOrders(userId, pagination));
    }

    requireAdmin(req);
    const status = url.searchParams.get("status") as
      | Parameters<typeof listCustomOrders>[0]["status"]
      | null;
    const q = url.searchParams.get("q") ?? undefined;
    return ok(await listCustomOrders({ status: status ?? undefined, q }, pagination));
  });
}

// POST /api/restaurant/social-orders — Request for Quote (no payment yet)
export function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, createCustomOrderSchema);
    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== input.userId) {
      throw new ApiError("Huwezi kuunda ombi kwa mtumiaji mwingine", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza au tumia channel ya WhatsApp", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new ApiError("Mtumiaji hajapatikani", 404);

    const order = await createCustomOrder({
      userId: input.userId,
      dishName: input.dishName,
      specialRequirements: input.specialRequirements || undefined,
      requestedFor: input.requestedFor,
      channel: input.channel,
      address: input.address || undefined,
    });

    void notifyAdminCustomOrder({
      id: order.id,
      dishName: order.dishName,
      specialRequirements: order.specialRequirements,
      requestedFor: order.requestedFor,
      mealSlot: order.mealSlot,
      channel: order.channel,
      address: order.address,
      customer: order.user ?? user,
    });

    return ok(order, 201);
  });
}
