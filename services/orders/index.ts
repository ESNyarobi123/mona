import { prisma, type BusinessModule, type OrderStatus, type MealSlot, type GroceryOrderType } from "@monana/db";
import { createOrderSchema } from "@monana/types";
import { computeDeliveryQuote } from "@monana/settings";
import { paginatedResult, type PaginationParams, validateGroceryScheduledFor } from "@monana/utils";
import { assertMealSlotOpen } from "../restaurant/meal-slots";
import { enqueueKitchen } from "../restaurant/kitchen-queue";
import type { CreateOrderArgs } from "./checkout-intent";

export type { CreateOrderArgs } from "./checkout-intent";

const STATUS_FLOW_GROCERY: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Restaurant: skip delivery step (pickup / dine-in). */
const STATUS_FLOW_RESTAURANT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["DELIVERED", "CANCELLED"],
  ON_THE_WAY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function statusFlow(module: BusinessModule): Record<OrderStatus, OrderStatus[]> {
  return module === "RESTAURANT" ? STATUS_FLOW_RESTAURANT : STATUS_FLOW_GROCERY;
}

async function resolveLineItem(it: { productId?: string; menuItemId?: string; quantity: number }) {
  if (it.menuItemId) {
    const item = await prisma.menuItem.findUnique({ where: { id: it.menuItemId } });
    if (!item || !item.available) throw new Error(`Kipengele cha menyu hakipatikani: ${it.menuItemId}`);
    return {
      menuItemId: item.id,
      productId: null as string | null,
      name: item.name,
      unit: item.unit,
      price: Number(item.price),
      quantity: it.quantity,
    };
  }
  if (it.productId) {
    const p = await prisma.product.findUnique({ where: { id: it.productId } });
    if (!p || !p.available) throw new Error(`Bidhaa haipatikani: ${it.productId}`);
    return {
      productId: p.id,
      menuItemId: null as string | null,
      name: p.name,
      unit: p.unit,
      price: Number(p.price),
      quantity: it.quantity,
    };
  }
  throw new Error("Kila item lazima iwe na productId au menuItemId");
}

export async function quoteOrderDelivery(args: {
  module: BusinessModule;
  address?: string;
  items: { productId?: string; menuItemId?: string; quantity: number }[];
  forceFreeDelivery?: boolean;
}) {
  const lineItems = await Promise.all(args.items.map(resolveLineItem));
  const subtotal = lineItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  return computeDeliveryQuote({
    module: args.module,
    address: args.address,
    subtotal,
    forceFreeDelivery: args.forceFreeDelivery,
  });
}

export async function createOrder(args: CreateOrderArgs) {
  const input = createOrderSchema.parse(args);

  if (input.module === "RESTAURANT" && input.mealSlot) {
    await assertMealSlotOpen(input.mealSlot);
  }

  const lineItems = await Promise.all(input.items.map(resolveLineItem));
  const subtotal = lineItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const quote = await computeDeliveryQuote({
    module: input.module,
    address: input.address,
    subtotal,
  });

  let scheduledFor: Date | undefined;
  if (input.scheduledFor) {
    scheduledFor =
      input.module === "GROCERY"
        ? validateGroceryScheduledFor(input.scheduledFor)
        : new Date(input.scheduledFor);
  }

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      module: input.module,
      orderType: input.module === "GROCERY" ? (input.subscriptionId ? "SUBSCRIPTION" : "ON_DEMAND") : null,
      channel: input.channel,
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      total: quote.total,
      deliveryZoneId: quote.zoneId,
      address: input.address,
      note: input.note,
      mealSlot: input.mealSlot,
      subscriptionId: input.subscriptionId,
      scheduledFor,
      paymentTiming: input.paymentTiming ?? "PAY_NOW",
      submittedAt: input.paymentTiming === "PAY_ON_DELIVERY" ? null : new Date(),
      items: { create: lineItems },
    },
    include: { items: true, user: { select: { id: true, name: true, phone: true } } },
  });

  if (input.module === "RESTAURANT" && input.mealSlot) {
    await enqueueKitchen(order.id, input.mealSlot);
  }

  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Oda haipatikani");

  const flow = statusFlow(order.module);
  const allowed = flow[order.status];
  if (!allowed.includes(status)) {
    throw new Error(`Hairuhusiwi kubadilisha kutoka ${order.status} kwenda ${status} (${order.module})`);
  }

  return prisma.order.update({ where: { id: orderId }, data: { status } });
}

export function getAllowedNextStatuses(module: BusinessModule, current: OrderStatus): OrderStatus[] {
  return statusFlow(module)[current] ?? [];
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true, menuItem: true } },
      payment: true,
      user: { select: { id: true, name: true, phone: true, email: true } },
      kitchenQueue: true,
      subscription: { include: { package: true } },
    },
  });
}

export async function getUserOrders(
  userId: string,
  module?: BusinessModule,
  params?: PaginationParams & { orderType?: GroceryOrderType }
) {
  const where = {
    userId,
    ...(module ? { module } : {}),
    ...(params?.orderType ? { orderType: params.orderType } : {}),
  };
  if (!params?.page && !params?.limit) {
    return prisma.order.findMany({
      where,
      include: { items: true, payment: true, kitchenQueue: true },
      orderBy: { createdAt: "desc" },
    });
  }
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: { items: true, payment: true, kitchenQueue: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);
  return paginatedResult(items, total, page, limit);
}

export async function listOrders(
  filters: {
    status?: OrderStatus;
    module?: BusinessModule;
    orderType?: GroceryOrderType;
    q?: string;
  },
  params?: PaginationParams
) {
  const clauses: Record<string, unknown>[] = [];
  if (filters.status) clauses.push({ status: filters.status });
  if (filters.module) clauses.push({ module: filters.module });
  if (filters.orderType) clauses.push({ orderType: filters.orderType });

  const term = filters.q?.trim();
  if (term) {
    clauses.push({
      OR: [
        { id: { contains: term, mode: "insensitive" } },
        { address: { contains: term, mode: "insensitive" } },
        { user: { phone: { contains: term } } },
        { user: { name: { contains: term, mode: "insensitive" } } },
        { items: { some: { name: { contains: term, mode: "insensitive" } } } },
      ],
    });
  }

  const where = clauses.length ? { AND: clauses } : {};
  const include = {
    items: true,
    payment: true,
    user: { select: { id: true, name: true, phone: true } },
    kitchenQueue: true,
  };

  if (!params?.page && !params?.limit) {
    return prisma.order.findMany({ where, include, orderBy: { createdAt: "desc" } });
  }

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, skip, take: limit, include, orderBy: { createdAt: "desc" } }),
    prisma.order.count({ where }),
  ]);
  return paginatedResult(items, total, page, limit);
}

export {
  createCheckoutIntent,
  fulfillCheckoutIntent,
  getCheckoutIntent,
  type CheckoutIntentPayload,
} from "./checkout-intent";
