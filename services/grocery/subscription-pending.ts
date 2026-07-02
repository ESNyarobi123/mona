import { prisma } from "@monana/db";
import { createSubscriptionCheckoutIntent } from "./subscription-engine";

export type SubscriptionPendingPayment =
  | {
      status: "ready";
      payId: string;
      kind: "ORDER" | "CHECKOUT_INTENT";
      amount: string;
      expiresAt: string | null;
    }
  | {
      status: "expired";
      amount: string | null;
    };

/** Resolve how a PENDING_PAYMENT subscription can be paid (order or checkout intent). */
export async function findSubscriptionPendingPayment(
  subscriptionId: string,
  userId: string
): Promise<SubscriptionPendingPayment | null> {
  const sub = await prisma.grocerySubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      orders: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { payment: true },
      },
    },
  });
  if (!sub || sub.userId !== userId || sub.status !== "PENDING_PAYMENT") return null;

  const pendingOrder = sub.orders.find(
    (o) =>
      o.status !== "CANCELLED" &&
      (!o.payment || ["PENDING", "FAILED"].includes(o.payment.status))
  );
  if (pendingOrder) {
    return {
      status: "ready",
      payId: pendingOrder.id,
      kind: "ORDER",
      amount: String(pendingOrder.total),
      expiresAt: null,
    };
  }

  const intent = await prisma.checkoutIntent.findFirst({
    where: {
      userId,
      consumedAt: null,
      payload: { path: ["subscriptionId"], equals: subscriptionId },
    },
    orderBy: { createdAt: "desc" },
  });

  if (intent) {
    if (intent.expiresAt > new Date()) {
      return {
        status: "ready",
        payId: intent.id,
        kind: "CHECKOUT_INTENT",
        amount: String(intent.total),
        expiresAt: intent.expiresAt.toISOString(),
      };
    }
    return { status: "expired", amount: String(intent.total) };
  }

  return { status: "expired", amount: null };
}

/** Create a fresh checkout intent when the previous payment link expired. */
export async function refreshSubscriptionPendingCheckout(subscriptionId: string, userId: string) {
  const sub = await prisma.grocerySubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.userId !== userId) throw new Error("Huna ruhusa");
  if (sub.status !== "PENDING_PAYMENT") {
    throw new Error("Usajili huu hausubiri malipo");
  }

  const existing = await findSubscriptionPendingPayment(subscriptionId, userId);
  if (existing?.status === "ready" && existing.kind === "ORDER") {
    return existing;
  }
  if (existing?.status === "ready" && existing.kind === "CHECKOUT_INTENT") {
    return existing;
  }

  await prisma.checkoutIntent.updateMany({
    where: {
      userId,
      consumedAt: null,
      payload: { path: ["subscriptionId"], equals: subscriptionId },
    },
    data: { expiresAt: new Date() },
  });

  const { intent } = await createSubscriptionCheckoutIntent(subscriptionId);
  return {
    status: "ready" as const,
    payId: intent.id,
    kind: "CHECKOUT_INTENT" as const,
    amount: String(intent.total),
    expiresAt: intent.expiresAt.toISOString(),
  };
}

/** Customer abandons an unpaid subscription enrollment. */
export async function customerCancelPendingSubscription(subscriptionId: string, userId: string) {
  const sub = await prisma.grocerySubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Usajili haupatikani");
  if (sub.userId !== userId) throw new Error("Huna ruhusa");
  if (sub.status !== "PENDING_PAYMENT") {
    throw new Error("Unaweza kufuta tu usajili unaosubiri malipo");
  }

  return prisma.$transaction(async (tx) => {
    await tx.checkoutIntent.updateMany({
      where: {
        userId,
        consumedAt: null,
        payload: { path: ["subscriptionId"], equals: subscriptionId },
      },
      data: { expiresAt: new Date() },
    });

    return tx.grocerySubscription.update({
      where: { id: subscriptionId },
      data: { status: "CANCELLED", nextRunAt: null },
    });
  });
}
