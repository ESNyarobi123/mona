import { prisma, Prisma, type Channel, type PackageKind, type SubscriptionFrequency } from "@monana/db";
import { createPaymentRequest } from "@monana/payment";
import { MEMBERSHIP_PLANS } from "@monana/utils";
import {
  assertGroceryDeliveryDay,
  dayOfWeekInTz,
  deliveryAtOnDate,
  validateGroceryScheduledFor,
} from "@monana/utils";
import { assertCanEnrollNewSubscription } from "./subscription-guard";
import { createCheckoutIntent } from "@monana/orders";

export type PackageItem = { productId: string; quantity: number };

export function parsePackageItems(raw: unknown): PackageItem[] {
  if (!Array.isArray(raw)) throw new Error("Mfuko hauna bidhaa sahihi");
  return raw.map((row) => {
    if (!row || typeof row !== "object") throw new Error("Mfuko hauna bidhaa sahihi");
    const { productId, quantity } = row as PackageItem;
    if (!productId || !quantity || quantity <= 0) throw new Error("Mfuko hauna bidhaa sahihi");
    return { productId, quantity };
  });
}

export function frequencyForPackageKind(kind: PackageKind): SubscriptionFrequency {
  return kind === "MONTHLY_PANTRY" ? "MONTHLY" : "WEEKLY";
}

/** Bei ya mzunguko baada ya punguzo + ofa za uwasilishaji. */
export function computeSubscriptionPrice(pkg: {
  price: { toString(): string } | number;
  discountPercent?: { toString(): string } | number | null;
  freeDelivery?: boolean;
}) {
  const subtotal = Number(pkg.price);
  const pct = Number(pkg.discountPercent ?? 0);
  const discount = Math.round(subtotal * (pct / 100));
  return {
    subtotal,
    discountPercent: pct,
    discountAmount: discount,
    total: subtotal - discount,
    freeDelivery: pkg.freeDelivery ?? false,
  };
}

function clampDayOfMonth(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last), 9, 0, 0, 0);
}

export type ScheduleInput = {
  frequency: SubscriptionFrequency;
  from?: Date;
  preferredDayOfWeek?: number | null;
  preferredDayOfMonth?: number | null;
  secondaryDayOfMonth?: number | null;
  deliveriesPerMonth?: number;
};

export function computeNextRunAt(input: ScheduleInput): Date {
  const from = input.from ?? new Date();
  const next = new Date(from);
  next.setHours(9, 0, 0, 0);

  if (input.frequency === "WEEKLY") {
    const dow = input.preferredDayOfWeek;
    if (dow != null) {
      const current = next.getDay();
      let daysUntil = dow - current;
      if (daysUntil <= 0) daysUntil += 7;
      if (daysUntil === 0 && next <= from) daysUntil = 7;
      next.setDate(next.getDate() + daysUntil);
    } else {
      next.setDate(next.getDate() + 7);
    }
    return next;
  }

  if (input.frequency === "MONTHLY") {
    if (input.preferredDayOfWeek != null && input.preferredDayOfMonth == null) {
      const dow = input.preferredDayOfWeek;
      const current = next.getDay();
      let daysUntil = dow - current;
      if (daysUntil <= 0) daysUntil += 7;
      if (daysUntil === 0 && next <= from) daysUntil = 7;
      next.setDate(next.getDate() + daysUntil);
      return next;
    }

    const primary = input.preferredDayOfMonth ?? from.getDate();
    const perMonth = input.deliveriesPerMonth ?? 1;
    const secondary = perMonth >= 2 ? (input.secondaryDayOfMonth ?? 15) : null;

    const candidates: Date[] = [];
    for (let monthOffset = 0; monthOffset <= 2; monthOffset++) {
      const y = from.getFullYear();
      const m = from.getMonth() + monthOffset;
      candidates.push(clampDayOfMonth(y, m, primary));
      if (secondary != null) candidates.push(clampDayOfMonth(y, m, secondary));
    }

    const after = candidates.filter((d) => d > from).sort((a, b) => a.getTime() - b.getTime());
    return after[0] ?? clampDayOfMonth(from.getFullYear(), from.getMonth() + 1, primary);
  }

  return next;
}

export function getOrderCutoffAt(nextRunAt: Date | null, cutoffHours: number): Date | null {
  if (!nextRunAt) return null;
  const cutoff = new Date(nextRunAt);
  cutoff.setHours(cutoff.getHours() - cutoffHours);
  return cutoff;
}

export function isBeforeOrderCutoff(nextRunAt: Date | null, cutoffHours: number): boolean {
  const cutoff = getOrderCutoffAt(nextRunAt, cutoffHours);
  if (!cutoff) return false;
  return new Date() < cutoff;
}

function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function scheduleFromSubscription(sub: {
  frequency: SubscriptionFrequency;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  secondaryDayOfMonth: number | null;
  deliveriesPerMonth: number;
}) {
  return {
    frequency: sub.frequency,
    preferredDayOfWeek: sub.preferredDayOfWeek,
    preferredDayOfMonth: sub.preferredDayOfMonth,
    secondaryDayOfMonth: sub.secondaryDayOfMonth,
    deliveriesPerMonth: sub.deliveriesPerMonth,
  };
}

function deliveryItemsForSub(sub: {
  nextDeliveryItems: unknown;
  defaultBasket: unknown;
  package: { items: unknown };
}): PackageItem[] {
  if (sub.nextDeliveryItems) return parsePackageItems(sub.nextDeliveryItems);
  if (sub.defaultBasket) return parsePackageItems(sub.defaultBasket);
  return parsePackageItems(sub.package.items);
}

export async function resolveLineItemsWithTotal(items: PackageItem[]) {
  const lineItems = await resolvePackageLineItems(items);
  const subtotal = lineItems.reduce((sum, it) => sum + it.price * Number(it.quantity), 0);
  return { items: lineItems, subtotal };
}

export async function pricingForSubscription(plan: "WEEKLY" | "MONTHLY", basket: PackageItem[]) {
  const { subtotal } = await resolveLineItemsWithTotal(basket);
  const planMeta = MEMBERSHIP_PLANS[plan];
  const discountAmount = Math.round(subtotal * (planMeta.discountPercent / 100));
  return {
    subtotal,
    discountPercent: planMeta.discountPercent,
    discountAmount,
    total: subtotal - discountAmount,
    freeDelivery: planMeta.freeDelivery,
  };
}

export async function pricingForPackageBasket(
  pkg: {
    discountPercent?: { toString(): string } | number | null;
    freeDelivery?: boolean;
  },
  basket: PackageItem[]
) {
  const { subtotal } = await resolveLineItemsWithTotal(basket);
  const pct = Number(pkg.discountPercent ?? 0);
  const discountAmount = Math.round(subtotal * (pct / 100));
  return {
    subtotal,
    discountPercent: pct,
    discountAmount,
    total: subtotal - discountAmount,
    freeDelivery: pkg.freeDelivery ?? false,
  };
}

export function assertBasketMeetsPackageMinimums(basket: PackageItem[], minimums: PackageItem[]) {
  const qtyByProduct = new Map(basket.map((b) => [b.productId, b.quantity]));
  for (const min of minimums) {
    const qty = qtyByProduct.get(min.productId) ?? 0;
    if (qty < min.quantity) {
      throw new Error("Huwezi kupunguza bidhaa za msingi za kifurushi");
    }
  }
}

async function pricingForDeliveryItems(
  sub: {
    defaultBasket: unknown;
    frequency: SubscriptionFrequency;
    package: Parameters<typeof computeSubscriptionPrice>[0];
  },
  items: PackageItem[]
) {
  if (sub.defaultBasket || Number(sub.package.price) === 0) {
    return pricingForSubscription(sub.frequency as "WEEKLY" | "MONTHLY", items);
  }
  return computeSubscriptionPrice(sub.package);
}

function buildOrderNote(sub: { note: string | null }, pricing: ReturnType<typeof computeSubscriptionPrice>) {
  const parts: string[] = [];
  if (sub.note) parts.push(sub.note);
  if (pricing.discountAmount > 0) parts.push(`Punguzo ${pricing.discountPercent}%: -TZS ${pricing.discountAmount.toLocaleString()}`);
  if (pricing.freeDelivery) parts.push("Uwasilishaji BURE");
  return parts.length ? parts.join(" | ") : undefined;
}

async function resolvePackageLineItems(items: PackageItem[]) {
  return Promise.all(
    items.map(async (it) => {
      const p = await prisma.product.findUnique({ where: { id: it.productId } });
      if (!p || !p.available) throw new Error(`Bidhaa haipatikani kwenye mfuko: ${it.productId}`);
      return {
        productId: p.id,
        menuItemId: null as string | null,
        name: p.name,
        unit: p.unit,
        price: Number(p.price),
        quantity: it.quantity,
      };
    })
  );
}

async function findCycleOrder(subscriptionId: string, scheduledFor: Date) {
  const { start, end } = dayBounds(scheduledFor);
  return prisma.order.findFirst({
    where: {
      subscriptionId,
      scheduledFor: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    include: { payment: true, items: true },
  });
}

/** Checkout intent for subscription first payment — order created when reference is submitted. */
export async function createSubscriptionCheckoutIntent(
  subscriptionId: string,
  options?: { scheduledFor?: Date }
) {
  const sub = await prisma.grocerySubscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true, user: true },
  });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.status === "CANCELLED") throw new Error("Usajili umesitishwa");

  const scheduledFor = options?.scheduledFor ?? sub.nextRunAt ?? new Date();
  const packageItems = deliveryItemsForSub(sub);
  const lineItems = await resolvePackageLineItems(packageItems);
  const pricing = await pricingForDeliveryItems(sub, packageItems);

  const intent = await createCheckoutIntent({
    userId: sub.userId,
    module: "GROCERY",
    channel: sub.channel,
    address: sub.address,
    note: buildOrderNote(sub, pricing),
    subscriptionId: sub.id,
    scheduledFor: scheduledFor.toISOString(),
    items: lineItems.map((it) => ({
      productId: it.productId ?? undefined,
      quantity: Number(it.quantity),
    })),
  });

  return { intent, subscription: sub, pricing };
}

/** Tengeneza oda ya malipo ya mbele — huduma inaanza baada ya malipo kuthibitishwa. */
export async function createSubscriptionPrepayOrder(
  subscriptionId: string,
  options?: { scheduledFor?: Date; skipDuplicateCheck?: boolean }
) {
  const sub = await prisma.grocerySubscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true, user: true },
  });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.status === "CANCELLED") throw new Error("Usajili umesitishwa");

  const scheduledFor = options?.scheduledFor ?? sub.nextRunAt ?? new Date();

  if (!options?.skipDuplicateCheck) {
    const existing = await findCycleOrder(sub.id, scheduledFor);
    if (existing) {
      return {
        order: existing,
        payment: existing.payment ?? (await prisma.payment.findUnique({ where: { orderId: existing.id } })),
        skipped: true as const,
      };
    }
  }

  const packageItems = deliveryItemsForSub(sub);
  const lineItems = await resolvePackageLineItems(packageItems);
  const pricing = await pricingForDeliveryItems(sub, packageItems);

  const order = await prisma.order.create({
    data: {
      userId: sub.userId,
      module: "GROCERY",
      orderType: "SUBSCRIPTION",
      channel: sub.channel,
      total: pricing.total,
      address: sub.address,
      note: buildOrderNote(sub, pricing),
      subscriptionId: sub.id,
      scheduledFor,
      items: { create: lineItems },
    },
    include: { items: true },
  });

  const payment = await createPaymentRequest(order.id);
  return { order, payment, skipped: false as const };
}

/** Baada ya malipo kuthibitishwa — amsha usajili na ratiba ijayo. */
export async function activateSubscriptionAfterPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { subscription: { include: { package: true } }, payment: true },
  });
  if (!order?.subscriptionId || !order.subscription) return null;
  if (order.payment?.status !== "PAID") return null;

  const sub = order.subscription;
  const scheduledFor = order.scheduledFor ?? new Date();
  const nextRunAt = computeNextRunAt({
    ...scheduleFromSubscription(sub),
    from: scheduledFor,
  });

  await prisma.grocerySubscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      nextRunAt,
      nextDeliveryItems: Prisma.DbNull,
    },
  });

  return sub.id;
}

export async function resumeExpiredPauses() {
  const now = new Date();
  const expired = await prisma.grocerySubscription.findMany({
    where: { status: "PAUSED", pausedUntil: { lte: now } },
  });
  for (const sub of expired) {
    await prisma.grocerySubscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", pausedUntil: null },
    });
  }
  return expired.length;
}

export async function pauseSubscription(
  subscriptionId: string,
  opts: { weeks?: number; until?: Date }
) {
  const sub = await prisma.grocerySubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.status === "CANCELLED") throw new Error("Usajili umesitishwa");

  let until = opts.until;
  if (!until && opts.weeks) {
    until = new Date();
    until.setDate(until.getDate() + opts.weeks * 7);
    until.setHours(23, 59, 59, 999);
  }

  return prisma.grocerySubscription.update({
    where: { id: subscriptionId },
    data: { status: "PAUSED", pausedUntil: until ?? null },
  });
}

export async function getUpcomingDelivery(subscriptionId: string) {
  const sub = await prisma.grocerySubscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true },
  });
  if (!sub) throw new Error("Usajili haupatikani");

  const cutoffHours = sub.package.orderCutoffHours;
  const nextRunAt = sub.nextRunAt;
  const canEditBasket = isBeforeOrderCutoff(nextRunAt, cutoffHours) && sub.status !== "CANCELLED";
  const items = deliveryItemsForSub(sub);
  const pricing = await pricingForDeliveryItems(sub, items);

  let pendingOrder = null;
  if (nextRunAt) {
    pendingOrder = await findCycleOrder(sub.id, nextRunAt);
  }

  return {
    subscriptionId: sub.id,
    status: sub.status,
    pausedUntil: sub.pausedUntil,
    nextRunAt,
    cutoffAt: getOrderCutoffAt(nextRunAt, cutoffHours),
    canEditBasket,
    items,
    pricing,
    pendingOrder: pendingOrder
      ? {
          id: pendingOrder.id,
          total: Number(pendingOrder.total),
          paymentStatus: pendingOrder.payment?.status ?? null,
        }
      : null,
  };
}

export async function updateSubscriptionBasket(subscriptionId: string, items: PackageItem[]) {
  const sub = await prisma.grocerySubscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true },
  });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.status === "CANCELLED") throw new Error("Usajili umesitishwa");

  parsePackageItems(items);

  if (!isBeforeOrderCutoff(sub.nextRunAt, sub.package.orderCutoffHours)) {
    throw new Error("Muda wa kubadilisha kikapu umepita (siku ya kufunga order)");
  }

  await resolvePackageLineItems(items);

  const pending = sub.nextRunAt ? await findCycleOrder(sub.id, sub.nextRunAt) : null;
  if (pending && pending.payment?.status === "PAID") {
    throw new Error("Malipo ya mzunguko huu yameshalipwa — huwezi kubadilisha kikapu");
  }

  if (pending) {
    const lineItems = await resolvePackageLineItems(items);
    const pricing = await pricingForDeliveryItems(sub, items);
    await prisma.orderItem.deleteMany({ where: { orderId: pending.id } });
    await prisma.order.update({
      where: { id: pending.id },
      data: {
        total: pricing.total,
        note: buildOrderNote(sub, pricing),
        items: { create: lineItems },
      },
    });
    if (pending.payment) {
      await prisma.payment.update({
        where: { id: pending.payment.id },
        data: { amount: pricing.total },
      });
    }
  }

  return prisma.grocerySubscription.update({
    where: { id: subscriptionId },
    data: { nextDeliveryItems: items },
  });
}

/** @deprecated alias */
export async function createSubscriptionDelivery(
  subscriptionId: string,
  options?: { scheduledFor?: Date; skipDuplicateCheck?: boolean }
) {
  const sub = await prisma.grocerySubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.status !== "ACTIVE") throw new Error("Usajili lazima uwe ACTIVE na malipo yamethibitishwa");

  const result = await createSubscriptionPrepayOrder(subscriptionId, options);
  if (!result.skipped && result.payment?.status !== "PAID") {
    throw new Error("Malipo ya mbele yanahitajika kabla ya utoaji");
  }
  return result;
}

export async function processDueSubscriptions() {
  await resumeExpiredPauses();
  const now = new Date();

  const due = await prisma.grocerySubscription.findMany({
    where: {
      status: "ACTIVE",
      nextRunAt: { lte: now },
      OR: [{ pausedUntil: null }, { pausedUntil: { lte: now } }],
    },
    include: { package: true },
  });

  const results: Array<{
    subscriptionId: string;
    orderId?: string;
    skipped?: boolean;
    waitingPayment?: boolean;
    error?: string;
  }> = [];

  for (const sub of due) {
    if (sub.pausedUntil && sub.pausedUntil > now) continue;

    try {
      const scheduledFor = sub.nextRunAt ?? now;
      const existing = await findCycleOrder(sub.id, scheduledFor);

      if (existing) {
        if (existing.payment?.status === "PAID") {
          results.push({ subscriptionId: sub.id, orderId: existing.id, skipped: true });
          continue;
        }
        results.push({ subscriptionId: sub.id, orderId: existing.id, waitingPayment: true });
        continue;
      }

      const { order, skipped } = await createSubscriptionPrepayOrder(sub.id, { scheduledFor });
      results.push({
        subscriptionId: sub.id,
        orderId: order.id,
        skipped,
        waitingPayment: true,
      });
    } catch (e) {
      results.push({
        subscriptionId: sub.id,
        error: e instanceof Error ? e.message : "Imeshindikana",
      });
    }
  }

  return { processed: results.length, results };
}

export function validateSubscriptionSchedule(
  pkg: { kind: PackageKind; deliveriesPerMonth: number },
  data: {
    preferredDayOfWeek?: number;
    preferredDayOfMonth?: number;
    secondaryDayOfMonth?: number;
    scheduledDeliveryDate?: string;
  }
) {
  if (pkg.kind === "WEEKLY_BASKET") {
    if (data.scheduledDeliveryDate == null && data.preferredDayOfWeek == null) {
      throw new Error("Chagua siku ya utoaji (Jumatano au Jumamosi)");
    }
    return;
  }
  if (data.preferredDayOfWeek == null && data.preferredDayOfMonth == null) {
    throw new Error("Chagua siku ya utoaji kila wiki (Jumatano au Jumamosi)");
  }
  if (data.preferredDayOfMonth != null && pkg.deliveriesPerMonth >= 2 && data.secondaryDayOfMonth == null) {
    throw new Error("Kifurushi hiki kinahitaji siku ya pili ya utoaji kwa mwezi");
  }
}

export async function enrollSubscription(data: {
  userId: string;
  packageId: string;
  frequency?: SubscriptionFrequency;
  address: string;
  channel?: Channel;
  preferredDayOfWeek?: number;
  preferredDayOfMonth?: number;
  secondaryDayOfMonth?: number;
  scheduledDeliveryDate?: string;
  note?: string;
  startNow?: boolean;
}) {
  const pkg = await prisma.groceryPackage.findUnique({ where: { id: data.packageId } });
  if (!pkg || !pkg.active) throw new Error("Kifurushi haipatikani au hauko hai");

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error("Mtumiaji hajapatikani");

  await assertCanEnrollNewSubscription(data.userId);

  parsePackageItems(pkg.items);
  validateSubscriptionSchedule(pkg, data);

  const frequency = data.frequency ?? frequencyForPackageKind(pkg.kind);
  const deliveriesPerMonth = pkg.kind === "MONTHLY_PANTRY" ? pkg.deliveriesPerMonth : 1;

  let preferredDayOfWeek = data.preferredDayOfWeek;
  let firstRun: Date;

  if (pkg.kind === "WEEKLY_BASKET" && data.scheduledDeliveryDate) {
    const deliveryAt = validateGroceryScheduledFor(deliveryAtOnDate(data.scheduledDeliveryDate));
    preferredDayOfWeek = dayOfWeekInTz(deliveryAt);
    assertGroceryDeliveryDay(preferredDayOfWeek);
    firstRun = deliveryAt;
  } else {
    if (preferredDayOfWeek != null) assertGroceryDeliveryDay(preferredDayOfWeek);
    firstRun = computeNextRunAt({
      frequency,
      from: new Date(),
      preferredDayOfWeek,
      preferredDayOfMonth: pkg.kind === "MONTHLY_PANTRY" && preferredDayOfWeek == null ? data.preferredDayOfMonth : null,
      secondaryDayOfMonth: data.secondaryDayOfMonth ?? (deliveriesPerMonth >= 2 ? 15 : null),
      deliveriesPerMonth,
    });
  }

  const scheduledFor = data.startNow ? new Date() : firstRun;
  const pricing = computeSubscriptionPrice(pkg);

  const subscription = await prisma.grocerySubscription.create({
    data: {
      userId: data.userId,
      packageId: data.packageId,
      frequency,
      status: "PENDING_PAYMENT",
      address: data.address,
      channel: data.channel ?? "WEB",
      preferredDayOfWeek,
      preferredDayOfMonth:
        pkg.kind === "MONTHLY_PANTRY" && preferredDayOfWeek == null ? data.preferredDayOfMonth : null,
      secondaryDayOfMonth:
        data.secondaryDayOfMonth ?? (deliveriesPerMonth >= 2 ? 15 : null),
      deliveriesPerMonth,
      note: data.note,
      nextRunAt: firstRun,
    },
    include: { package: true, user: { select: { id: true, name: true, phone: true } } },
  });

  const delivery = await createSubscriptionCheckoutIntent(subscription.id, {
    scheduledFor,
  });

  const updated = await prisma.grocerySubscription.findUnique({
    where: { id: subscription.id },
    include: { package: true, user: { select: { id: true, name: true, phone: true } } },
  });

  return {
    subscription: updated!,
    checkoutIntentId: delivery.intent.id,
    firstOrder: null,
    firstPayment: null,
    pricing,
    message:
      pricing.discountAmount > 0 || pricing.freeDelivery
        ? `Malipo ya mbele: ${pricing.total.toLocaleString()} TZS` +
          (pricing.discountAmount > 0 ? ` (punguzo ${pricing.discountPercent}%)` : "") +
          (pricing.freeDelivery ? " + uwasilishaji BURE" : "")
        : "Lipa kabla ya huduma kuanza",
  };
}
