import { prisma, type Prisma, type BusinessModule, type MealSlot } from "@monana/db";
import { createOrderSchema } from "@monana/types";
import { computeDeliveryQuote } from "@monana/settings";
import {
  genOrderRef,
  normalizePaymentProofReference,
  paymentReferenceDuplicateMessage,
  validateGroceryScheduledFor,
} from "@monana/utils";
import { assertMealSlotOpen } from "../restaurant/meal-slots";
import { enqueueKitchen } from "../restaurant/kitchen-queue";

export type CreateOrderArgs = {
  userId: string;
  module: BusinessModule;
  channel?: "WEB" | "WHATSAPP";
  items: { productId?: string; menuItemId?: string; quantity: number }[];
  address?: string;
  note?: string;
  mealSlot?: MealSlot;
  subscriptionId?: string;
  scheduledFor?: string;
  paymentTiming?: "PAY_NOW" | "PAY_ON_DELIVERY";
};

const CHECKOUT_INTENT_TTL_HOURS = 24;

export type CheckoutIntentLineItem = {
  productId: string | null;
  menuItemId: string | null;
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

export type CheckoutIntentPayload = {
  userId: string;
  module: "RESTAURANT" | "GROCERY";
  channel: "WEB" | "WHATSAPP";
  address?: string;
  note?: string;
  mealSlot?: MealSlot;
  subscriptionId?: string;
  scheduledFor?: string;
  lineItems: CheckoutIntentLineItem[];
  subtotal: number;
  deliveryFee: number;
  deliveryZoneId?: string | null;
};

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
    if (!p.inStock) throw new Error(`"${p.name}" imeisha stoo — haiwezi kuongezwa kwenye oda.`);
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

async function buildCheckoutPayload(args: CreateOrderArgs): Promise<CheckoutIntentPayload> {
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

  return {
    userId: input.userId,
    module: input.module,
    channel: input.channel ?? "WEB",
    address: input.address,
    note: input.note,
    mealSlot: input.mealSlot,
    subscriptionId: input.subscriptionId,
    scheduledFor: input.scheduledFor,
    lineItems,
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    deliveryZoneId: quote.zoneId,
  };
}

function intentExpiresAt() {
  const expires = new Date();
  expires.setHours(expires.getHours() + CHECKOUT_INTENT_TTL_HOURS);
  return expires;
}

function assertIntentUsable(intent: { consumedAt: Date | null; expiresAt: Date }) {
  if (intent.consumedAt) throw new Error("Checkout hii tayari imetumika");
  if (intent.expiresAt <= new Date()) {
    throw new Error("Muda wa malipo umepita. Tengeneza oda mpya.");
  }
}

async function assertPaymentReferenceAvailable(
  tx: Prisma.TransactionClient,
  reference: string,
  userId: string,
  userLocale?: string | null
) {
  if (reference === "MANUAL") return;

  const duplicate = await tx.payment.findFirst({
    where: {
      status: { in: ["AWAITING_CONFIRMATION", "PAID", "REFUNDED"] },
      reference: { equals: reference, mode: "insensitive" },
    },
    select: { userId: true },
  });

  if (duplicate) {
    const locale = userLocale === "en" ? "en" : "sw";
    throw new Error(paymentReferenceDuplicateMessage(duplicate.userId === userId, locale));
  }
}

/** Stage checkout — no Order row until customer submits payment reference. */
export async function createCheckoutIntent(args: CreateOrderArgs) {
  const payload = await buildCheckoutPayload(args);
  const total = payload.subtotal + payload.deliveryFee;

  return prisma.checkoutIntent.create({
    data: {
      userId: payload.userId,
      module: payload.module,
      channel: payload.channel,
      total,
      payload,
      paymentToken: genOrderRef(),
      expiresAt: intentExpiresAt(),
    },
  });
}

export async function getCheckoutIntent(intentId: string) {
  return prisma.checkoutIntent.findUnique({
    where: { id: intentId },
    include: { user: { select: { id: true, name: true, phone: true, locale: true } } },
  });
}

/** Create Order + Payment when customer submits M-Pesa / Lipa Namba reference. */
export async function fulfillCheckoutIntent(intentId: string, customerReference: string) {
  const normalized = normalizePaymentProofReference(customerReference);
  if (!normalized) {
    throw new Error("Andika reference sahihi ya malipo (namba kutoka M-Pesa au SMS).");
  }

  const result = await prisma.$transaction(async (tx) => {
    const intent = await tx.checkoutIntent.findUnique({
      where: { id: intentId },
      include: { user: { select: { locale: true } } },
    });
    if (!intent) throw new Error("Checkout haipatikani");
    assertIntentUsable(intent);

    const payload = intent.payload as CheckoutIntentPayload;
    await assertPaymentReferenceAvailable(tx, normalized, intent.userId, intent.user?.locale);

    let scheduledFor: Date | undefined;
    if (payload.scheduledFor) {
      scheduledFor =
        payload.module === "GROCERY"
          ? validateGroceryScheduledFor(payload.scheduledFor)
          : new Date(payload.scheduledFor);
    }

    const order = await tx.order.create({
      data: {
        userId: payload.userId,
        module: payload.module,
        orderType:
          payload.module === "GROCERY"
            ? payload.subscriptionId
              ? "SUBSCRIPTION"
              : "ON_DEMAND"
            : null,
        channel: payload.channel,
        subtotal: payload.subtotal,
        deliveryFee: payload.deliveryFee,
        total: intent.total,
        deliveryZoneId: payload.deliveryZoneId ?? null,
        address: payload.address,
        note: payload.note,
        mealSlot: payload.mealSlot,
        subscriptionId: payload.subscriptionId,
        scheduledFor,
        paymentTiming: "PAY_NOW",
        submittedAt: new Date(),
        items: { create: payload.lineItems },
      },
      include: { items: true },
    });

    let payment;
    try {
      payment = await tx.payment.create({
        data: {
          orderId: order.id,
          userId: intent.userId,
          amount: intent.total,
          method: "MANUAL_LIPA_NAMBA",
          status: "AWAITING_CONFIRMATION",
          reference: normalized,
        },
      });
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("Payment_proof_reference_unique") ||
          err.message.includes("unique constraint"))
      ) {
        const locale = intent.user?.locale === "en" ? "en" : "sw";
        throw new Error(paymentReferenceDuplicateMessage(false, locale));
      }
      throw err;
    }

    await tx.checkoutIntent.update({
      where: { id: intent.id },
      data: { consumedAt: new Date(), orderId: order.id },
    });

    return { order, payment, mealSlot: payload.mealSlot };
  });

  if (result.order.module === "RESTAURANT" && result.mealSlot) {
    await enqueueKitchen(result.order.id, result.mealSlot);
  }

  return { order: result.order, payment: result.payment };
}
