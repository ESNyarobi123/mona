import { enrollMembershipSchema } from "@monana/types";
import { enrollCustomerMembership, getMembershipSetup } from "@monana/grocery";
import { parseLocale } from "@monana/i18n";
import { prisma } from "@monana/db";
import { notifyAdminNewOrder, notifyCustomerOrderReceived } from "../../../../../lib/whatsapp";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, isBotChannel, requireSelfAdminOrBot } from "../../../../../lib/auth";

/** Membership setup: plans, delivery days, products for basket */
export function GET(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    return ok(await getMembershipSetup(locale));
  });
}

/** Jisajili kwa uanachama + kikapu cha msingi (default basket) */
export function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, enrollMembershipSchema);
    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== input.userId) {
      throw new ApiError("Huwezi kusajili kwa mtumiaji mwingine", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza au tumia channel ya WhatsApp", 401);
    }
    requireSelfAdminOrBot(req, input.userId);

    const result = await enrollCustomerMembership(input);

    if (result.firstOrder) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      const orderDetail = await prisma.order.findUnique({
        where: { id: result.firstOrder.id },
        include: { items: true },
      });
      if (user && orderDetail) {
        await notifyAdminNewOrder({
          id: orderDetail.id,
          module: "GROCERY",
          channel: orderDetail.channel,
          total: Number(orderDetail.total),
          address: orderDetail.address,
          mealSlot: null,
          customer: user,
          items: orderDetail.items.map((i) => ({
            name: i.name,
            quantity: Number(i.quantity),
            price: Number(i.price),
          })),
        });
        if (user.phone) {
          await notifyCustomerOrderReceived({
            phone: user.phone,
            orderId: orderDetail.id,
            total: Number(orderDetail.total),
          });
        }
      }
    }

    return ok(result, 201);
  });
}
