import {
  prisma,
  type Channel,
  type CustomOrderStatus,
  type MealSlot,
} from "@monana/db";
import { formatTZS, genOrderRef, paginatedResult, type PaginationParams } from "@monana/utils";
import { TZ_EAT } from "./meal-slot-settings";
import { getLocalTimeParts } from "./meal-slots";
import { enqueueKitchen } from "./kitchen-queue";

/** Minimum lead time before requestedFor (hours). Client: 2.5–3 hours. */
export const CUSTOM_ORDER_MIN_LEAD_HOURS = 2.5;
export const CUSTOM_ORDER_MIN_LEAD_MS = CUSTOM_ORDER_MIN_LEAD_HOURS * 60 * 60 * 1000;

/** Alias used in product copy */
export const SOCIAL_ORDER_LABEL = "Special Orders";

const CUSTOMER_CANCELABLE: CustomOrderStatus[] = ["PENDING", "QUOTED"];

const ADMIN_TRANSITIONS: Record<CustomOrderStatus, CustomOrderStatus[]> = {
  PENDING: ["QUOTED", "REJECTED", "CANCELLED"],
  QUOTED: ["PREPARING", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "REJECTED", "CANCELLED"],
  REJECTED: [],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export type CreateCustomOrderInput = {
  userId: string;
  dishName: string;
  specialRequirements?: string;
  requestedFor: string | Date;
  channel?: Channel;
  address?: string;
};

function parseRequestedFor(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Muda wa kupokea si sahihi");
  }
  return date;
}

/** Infer meal slot from requested receive time (EAT clock). */
export function inferMealSlotFromRequestedFor(date: Date): MealSlot {
  const { hour } = getLocalTimeParts(date, TZ_EAT);
  if (hour < 11) return "BREAKFAST";
  if (hour < 16) return "LUNCH";
  return "DINNER";
}

export function assertCustomOrderLeadTime(requestedFor: Date, now = new Date()) {
  const earliest = new Date(now.getTime() + CUSTOM_ORDER_MIN_LEAD_MS);
  if (requestedFor.getTime() < earliest.getTime()) {
    throw new Error(
      `Maombi ya Special Orders yatume angalau saa ${CUSTOM_ORDER_MIN_LEAD_HOURS} (hadi masaa 3) kabla ya muda wa kupokea — ili tupate nafasi ya kununua mahitaji na kupika.`
    );
  }
}

function buildOrderNote(dishName: string, specialRequirements?: string | null) {
  const lines = [`Special Orders: ${dishName}`];
  if (specialRequirements?.trim()) lines.push(`Mahitaji: ${specialRequirements.trim()}`);
  lines.push("Malipo: Lipa sasa tu (hakuna Cash on Delivery).");
  return lines.join("\n");
}

export async function createCustomOrder(input: CreateCustomOrderInput) {
  const dishName = input.dishName.trim();
  if (dishName.length < 2) throw new Error("Andika jina la chakula/mboga");

  const requestedFor = parseRequestedFor(input.requestedFor);
  assertCustomOrderLeadTime(requestedFor);

  const specialRequirements = input.specialRequirements?.trim() || null;
  const address = input.address?.trim() || null;

  return prisma.restaurantCustomOrder.create({
    data: {
      userId: input.userId,
      dishName,
      specialRequirements,
      requestedFor,
      mealSlot: inferMealSlotFromRequestedFor(requestedFor),
      channel: input.channel ?? "WEB",
      address,
      status: "PENDING",
    },
    include: {
      user: { select: { id: true, name: true, phone: true, locale: true } },
    },
  });
}

export async function getCustomOrderById(id: string) {
  return prisma.restaurantCustomOrder.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true, locale: true } },
    },
  });
}

export async function getCustomOrderByOrderId(orderId: string) {
  return prisma.restaurantCustomOrder.findFirst({
    where: { orderId },
    include: {
      user: { select: { id: true, name: true, phone: true, locale: true } },
    },
  });
}

export async function listUserCustomOrders(userId: string, pagination: PaginationParams = {}) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const where = { userId };
  const [total, items] = await Promise.all([
    prisma.restaurantCustomOrder.count({ where }),
    prisma.restaurantCustomOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, phone: true, locale: true } },
      },
    }),
  ]);

  const orderIds = items.map((i) => i.orderId).filter((id): id is string => Boolean(id));
  const payments =
    orderIds.length === 0
      ? []
      : await prisma.payment.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true, status: true },
        });
  const paymentByOrder = Object.fromEntries(payments.map((p) => [p.orderId, p.status]));

  const enriched = items.map((item) => ({
    ...item,
    paymentStatus: item.orderId ? (paymentByOrder[item.orderId] ?? null) : null,
  }));

  return paginatedResult(enriched, total, page, limit);
}

export async function listCustomOrders(
  filters: { status?: CustomOrderStatus; q?: string } = {},
  pagination: PaginationParams = {}
) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const q = filters.q?.trim();
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { dishName: { contains: q, mode: "insensitive" as const } },
            { specialRequirements: { contains: q, mode: "insensitive" as const } },
            { user: { phone: { contains: q } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.restaurantCustomOrder.count({ where }),
    prisma.restaurantCustomOrder.findMany({
      where,
      orderBy: [{ status: "asc" }, { requestedFor: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, phone: true, locale: true } },
      },
    }),
  ]);
  return paginatedResult(items, total, page, limit);
}

/**
 * Admin Request-for-Quote: set price and create a PAY_NOW Order.
 * Cooking does NOT start until payment is confirmed.
 */
export async function sendSocialOrderQuote(
  id: string,
  quotedPrice: number,
  adminNote?: string | null
) {
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
    throw new Error("Weka bei sahihi (mfano 18500)");
  }
  const price = Math.round(quotedPrice);

  const existing = await prisma.restaurantCustomOrder.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, phone: true, locale: true } } },
  });
  if (!existing) throw new Error("Special Order haipatikani");
  if (!["PENDING", "QUOTED"].includes(existing.status)) {
    throw new Error(`Huwezi kutuma bei wakati status ni ${existing.status}`);
  }

  const note = buildOrderNote(existing.dishName, existing.specialRequirements);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let orderId = existing.orderId;

    if (orderId) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!order) {
        orderId = null;
      } else if (order.payment?.status === "PAID" || order.payment?.status === "AWAITING_CONFIRMATION") {
        throw new Error("Mteja tayari amelipa au ametuma reference — huwezi kubadilisha bei");
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal: price,
            deliveryFee: 0,
            total: price,
            note,
            address: existing.address,
            mealSlot: existing.mealSlot,
            scheduledFor: existing.requestedFor,
            paymentTiming: "PAY_NOW",
          },
        });
        await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            name: existing.dishName,
            unit: "PIECE",
            quantity: 1,
            price,
          },
        });
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { amount: price, status: "PENDING", reference: genOrderRef() },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              userId: existing.userId,
              amount: price,
              method: "MANUAL_LIPA_NAMBA",
              status: "PENDING",
              reference: genOrderRef(),
            },
          });
        }
      }
    }

    if (!orderId) {
      const order = await tx.order.create({
        data: {
          userId: existing.userId,
          module: "RESTAURANT",
          channel: existing.channel,
          status: "PENDING",
          paymentTiming: "PAY_NOW",
          subtotal: price,
          deliveryFee: 0,
          total: price,
          address: existing.address,
          note,
          mealSlot: existing.mealSlot,
          scheduledFor: existing.requestedFor,
          submittedAt: null,
          items: {
            create: [
              {
                name: existing.dishName,
                unit: "PIECE",
                quantity: 1,
                price,
              },
            ],
          },
          payment: {
            create: {
              userId: existing.userId,
              amount: price,
              method: "MANUAL_LIPA_NAMBA",
              status: "PENDING",
              reference: genOrderRef(),
            },
          },
        },
      });
      orderId = order.id;
    }

    const socialOrder = await tx.restaurantCustomOrder.update({
      where: { id },
      data: {
        status: "QUOTED",
        quotedPrice: price,
        adminNote: adminNote?.trim() || null,
        orderId,
        quotedAt: now,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, locale: true } },
      },
    });

    return socialOrder;
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const payPath = `/pay/${result.orderId}`;
  const payUrl = `${appUrl}${payPath}`;

  return {
    socialOrder: result,
    orderId: result.orderId as string,
    quotedPrice: price,
    payUrl,
    payPath,
    priceLabel: formatTZS(price),
  };
}

/** After Lipa Namba is confirmed — start cooking (no COD path). */
export async function markSocialOrderPaidAndStartKitchen(orderId: string) {
  const social = await prisma.restaurantCustomOrder.findFirst({ where: { orderId } });
  if (!social) return null;

  if (["PREPARING", "READY", "COMPLETED"].includes(social.status)) {
    return social;
  }

  const updated = await prisma.restaurantCustomOrder.update({
    where: { id: social.id },
    data: { status: "PREPARING" },
    include: {
      user: { select: { id: true, name: true, phone: true, locale: true } },
    },
  });

  if (updated.mealSlot) {
    const queued = await prisma.kitchenQueue.findUnique({ where: { orderId } });
    if (!queued) {
      await enqueueKitchen(orderId, updated.mealSlot);
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PREPARING", submittedAt: new Date() },
  });

  return updated;
}

export async function updateCustomOrderStatus(
  id: string,
  data: {
    status: CustomOrderStatus;
    quotedPrice?: number | null;
    adminNote?: string | null;
  }
) {
  if (data.status === "QUOTED") {
    throw new Error("Tumia Send Price kutuma bei kwa mteja");
  }
  if (data.status === "PREPARING") {
    throw new Error("Kupika kunaanza baada tu ya mteja kulipa — thibitisha malipo kwanza");
  }

  const existing = await prisma.restaurantCustomOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Special Order haipatikani");

  const allowed = ADMIN_TRANSITIONS[existing.status];
  if (!allowed.includes(data.status)) {
    throw new Error(`Huwezi kubadilisha status kutoka ${existing.status} kwenda ${data.status}`);
  }

  return prisma.restaurantCustomOrder.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.adminNote !== undefined ? { adminNote: data.adminNote?.trim() || null } : {}),
    },
    include: {
      user: { select: { id: true, name: true, phone: true, locale: true } },
    },
  });
}

export async function cancelCustomOrder(id: string, userId: string) {
  const existing = await prisma.restaurantCustomOrder.findUnique({
    where: { id },
    include: { /* order via orderId lookup below */ },
  });
  if (!existing) throw new Error("Special Order haipatikani");
  if (existing.userId !== userId) throw new Error("Huna ruhusa");
  if (!CUSTOMER_CANCELABLE.includes(existing.status)) {
    throw new Error("Huwezi kufuta ombi hili sasa — wasiliana na Monana");
  }

  if (existing.orderId) {
    const payment = await prisma.payment.findUnique({ where: { orderId: existing.orderId } });
    if (payment && (payment.status === "PAID" || payment.status === "AWAITING_CONFIRMATION")) {
      throw new Error("Huwezi kufuta — malipo yameshatumwa au kuthibitishwa");
    }
    await prisma.order.update({
      where: { id: existing.orderId },
      data: { status: "CANCELLED" },
    });
  }

  return prisma.restaurantCustomOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: {
      user: { select: { id: true, name: true, phone: true, locale: true } },
    },
  });
}

export function customOrderLeadTimeInfo() {
  return {
    label: SOCIAL_ORDER_LABEL,
    minLeadHours: CUSTOM_ORDER_MIN_LEAD_HOURS,
    recommendedLeadHours: 3,
    timezone: TZ_EAT,
    payBeforeCook: true,
    cashOnDeliveryAllowed: false,
    messageSw:
      "Special Orders ni ombi la nukuu (Request for Quote): tuma bila kulipa. Baada ya bei kutumwa, lazima ulipe kabla chakula hakijaanza kupikwa (hakuna Cash on Delivery). Tuma ombi angalau saa 2.5–3 kabla ya muda wa kula.",
    messageEn:
      "Special Orders are a request for quote: submit without paying. After we send the price, you must pay before cooking starts (no cash on delivery). Send requests at least 2.5–3 hours before your receive time.",
  };
}
