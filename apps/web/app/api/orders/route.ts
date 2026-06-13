import { createOrderSchema } from "@monana/types";
import { createOrder, getUserOrders, listOrders } from "@monana/orders";
import { prisma } from "@monana/db";
import { parsePagination } from "@monana/utils";
import { notifyAdminNewOrder, notifyCustomerOrderReceived } from "../../../lib/whatsapp";
import { handle, ok, parseBody } from "../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireAdmin, requireSelfAdminOrBot } from "../../../lib/auth";

// GET /api/orders?userId= | admin: ?status=&module=&page=&limit=
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const pagination = parsePagination(url.searchParams);

    if (userId) {
      requireSelfAdminOrBot(req, userId);
      const module = url.searchParams.get("module") as "RESTAURANT" | "GROCERY" | undefined;
      const orderType = url.searchParams.get("orderType") as "ON_DEMAND" | "SUBSCRIPTION" | null;
      return ok(
        await getUserOrders(userId, module, {
          page: pagination.page,
          limit: pagination.limit,
          orderType: orderType ?? undefined,
        })
      );
    }

    requireAdmin(req);
    const status = url.searchParams.get("status") as Parameters<typeof listOrders>[0]["status"];
    const module = url.searchParams.get("module") as "RESTAURANT" | "GROCERY" | undefined;
    const orderType = url.searchParams.get("orderType") as "ON_DEMAND" | "SUBSCRIPTION" | null;
    const q = url.searchParams.get("q") ?? undefined;
    return ok(
      await listOrders(
        {
          status: status ?? undefined,
          module: module ?? undefined,
          orderType: orderType ?? undefined,
          q,
        },
        { page: pagination.page, limit: pagination.limit }
      )
    );
  });
}

// POST /api/orders — customer / WhatsApp bot
export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, createOrderSchema);
    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== input.userId) {
      throw new ApiError("Huwezi kuunda oda kwa mtumiaji mwingine", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza au tumia channel ya WhatsApp", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new ApiError("Mtumiaji hajapatikani", 404);

    const order = await createOrder(input);

    await notifyAdminNewOrder({
      id: order.id,
      module: order.module,
      channel: order.channel,
      total: Number(order.total),
      address: order.address,
      mealSlot: order.mealSlot,
      customer: user,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
      })),
    });

    if (user.phone) {
      await notifyCustomerOrderReceived({
        phone: user.phone,
        orderId: order.id,
        total: Number(order.total),
      });
    }

    return ok(order, 201);
  });
}
