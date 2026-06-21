/** Minimal order fields needed to decide if a customer can pay. */
export type OrderPaymentFields = {
  status: string;
  paymentTiming?: "PAY_NOW" | "PAY_ON_DELIVERY" | string | null;
  submittedAt?: Date | string | null;
  payment?: { status: string } | null;
};

export function isPayOnDeliveryOrder(order: OrderPaymentFields): boolean {
  return order.paymentTiming === "PAY_ON_DELIVERY";
}

/** Pay-on-delivery request sent but admin has not approved yet. */
export function needsPayOnDeliveryApproval(order: OrderPaymentFields): boolean {
  return (
    isPayOnDeliveryOrder(order) &&
    !order.submittedAt &&
    order.status !== "CANCELLED"
  );
}

/** Pay-on-delivery order is ready for payment (approved, cargo on the way or delivered). */
export function canPayOnDeliveryOrder(order: OrderPaymentFields): boolean {
  if (!isPayOnDeliveryOrder(order)) return false;
  if (!order.submittedAt) return false;
  if (order.status === "CANCELLED") return false;
  if (!["ON_THE_WAY", "DELIVERED"].includes(order.status)) return false;
  if (!order.payment) return true;
  return ["PENDING", "FAILED"].includes(order.payment.status);
}

/** Whether the customer should see a pay action (web /pay or bot payment flow). */
export function canCustomerPayOrder(order: OrderPaymentFields): boolean {
  if (order.status === "CANCELLED") return false;
  if (order.payment?.status === "PAID" || order.payment?.status === "AWAITING_CONFIRMATION") {
    return false;
  }
  if (isPayOnDeliveryOrder(order)) return canPayOnDeliveryOrder(order);
  return !order.payment || ["PENDING", "FAILED"].includes(order.payment.status);
}

/** Pay-on-delivery chosen but delivery has not started yet — block payment UI. */
export function isWaitingForDeliveryBeforePayment(order: OrderPaymentFields): boolean {
  if (!isPayOnDeliveryOrder(order)) return false;
  if (order.status === "CANCELLED") return false;
  if (!order.submittedAt) return false;
  return !["ON_THE_WAY", "DELIVERED"].includes(order.status);
}

const FULFILLMENT_BLOCK_MESSAGES = {
  payLaterApproval: {
    en: "Order awaits admin approval — approve the pay-on-delivery request on Orders first.",
    sw: "Oda inasubiri idhini ya admin — kubali ombi la kulipia ukifika kwenye Oda kwanza.",
  },
  paymentAwaitingConfirm: {
    en: "Payment not verified yet — confirm it on the Payments page first.",
    sw: "Malipo bado hayajathibitishwa — thibitisha malipo kwenye ukurasa wa Malipo kwanza.",
  },
  paymentNotVerified: {
    en: "Payment has not been verified — confirm payment on the Payments page first.",
    sw: "Oda bado haijafanyiwa uhakiki wa malipo — thibitisha malipo kwenye ukurasa wa Malipo kwanza.",
  },
} as const;

/** Why admin cannot advance order fulfillment (null = allowed). */
export function orderFulfillmentBlockedReason(
  order: OrderPaymentFields,
  locale: "en" | "sw" = "sw"
): string | null {
  if (order.status === "CANCELLED") return null;

  if (needsPayOnDeliveryApproval(order)) {
    return FULFILLMENT_BLOCK_MESSAGES.payLaterApproval[locale];
  }

  if (isPayOnDeliveryOrder(order)) {
    return null;
  }

  if (!order.payment || order.payment.status === "PENDING" || order.payment.status === "FAILED") {
    return FULFILLMENT_BLOCK_MESSAGES.paymentNotVerified[locale];
  }

  if (order.payment.status === "AWAITING_CONFIRMATION") {
    return FULFILLMENT_BLOCK_MESSAGES.paymentAwaitingConfirm[locale];
  }

  if (order.payment.status !== "PAID") {
    return FULFILLMENT_BLOCK_MESSAGES.paymentNotVerified[locale];
  }

  return null;
}

export function canAdvanceOrderFulfillment(order: OrderPaymentFields): boolean {
  return orderFulfillmentBlockedReason(order) === null;
}
