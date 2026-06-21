import { prisma, type Prisma } from "@monana/db";
import { genOrderRef, normalizePaymentProofReference, paginatedResult, paymentReferenceDuplicateMessage, needsPayOnDeliveryApproval, type PaginationParams } from "@monana/utils";

const PROOF_REFERENCE_STATUSES = ["AWAITING_CONFIRMATION", "PAID", "REFUNDED"] as const;

async function assertPaymentReferenceAvailable(
  tx: Prisma.TransactionClient,
  reference: string,
  paymentId: string,
  userId: string,
  userLocale?: string | null
) {
  if (reference === "MANUAL") return;

  const duplicate = await tx.payment.findFirst({
    where: {
      id: { not: paymentId },
      status: { in: [...PROOF_REFERENCE_STATUSES] },
      reference: { equals: reference, mode: "insensitive" },
    },
    select: { userId: true },
  });

  if (duplicate) {
    const locale = userLocale === "en" ? "en" : "sw";
    throw new Error(paymentReferenceDuplicateMessage(duplicate.userId === userId, locale));
  }
}

export async function createPaymentRequest(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Oda haipatikani");

  if (order.paymentTiming === "PAY_ON_DELIVERY" && !["ON_THE_WAY", "DELIVERED"].includes(order.status)) {
    throw new Error("Omba kulipia baada ya kupokea mzigo wako");
  }

  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing) {
    if (existing.status === "FAILED") {
      return prisma.payment.update({
        where: { id: existing.id },
        data: { status: "PENDING", reference: genOrderRef() },
      });
    }
    return existing;
  }

  return prisma.payment.create({
    data: {
      orderId: order.id,
      userId: order.userId,
      amount: order.total,
      method: "MANUAL_LIPA_NAMBA",
      status: "PENDING",
      reference: genOrderRef(),
    },
  });
}

export async function submitManualPayment(paymentId: string, reference: string) {
  const normalized = normalizePaymentProofReference(reference);
  if (!normalized) {
    throw new Error("Andika reference sahihi ya malipo (namba kutoka M-Pesa au SMS).");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { locale: true } } },
    });
    if (!payment) throw new Error("Malipo hayapatikani");
    if (payment.status !== "PENDING") {
      throw new Error(`Malipo tayari ${payment.status}`);
    }

    await assertPaymentReferenceAvailable(
      tx,
      normalized,
      paymentId,
      payment.userId,
      payment.user?.locale
    );

    try {
      return await tx.payment.update({
        where: { id: paymentId },
        data: { status: "AWAITING_CONFIRMATION", reference: normalized },
      });
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("Payment_proof_reference_unique") ||
          err.message.includes("unique constraint"))
      ) {
        const locale = payment.user?.locale === "en" ? "en" : "sw";
        throw new Error(paymentReferenceDuplicateMessage(false, locale));
      }
      throw err;
    }
  });
}

export async function confirmPayment(paymentId: string) {
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { status: true, paymentTiming: true, submittedAt: true } } },
  });
  if (!existing) throw new Error("Malipo hayapatikani");

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID" },
  });

  const orderUpdate: { status?: "CONFIRMED"; submittedAt?: Date } = {};
  if (existing.order.paymentTiming === "PAY_ON_DELIVERY") {
    if (existing.order.status === "PENDING" && existing.order.submittedAt) {
      orderUpdate.status = "CONFIRMED";
    }
  } else {
    orderUpdate.status = "CONFIRMED";
    orderUpdate.submittedAt = new Date();
  }

  if (Object.keys(orderUpdate).length) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: orderUpdate,
    });
  }

  return payment;
}

export async function failPayment(paymentId: string) {
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { paymentTiming: true, submittedAt: true, status: true } } },
  });
  if (!existing) throw new Error("Malipo hayapatikani");

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED" },
  });

  if (existing.order.paymentTiming === "PAY_ON_DELIVERY" && needsPayOnDeliveryApproval(existing.order)) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELLED" },
    });
  }

  return payment;
}

/** Customer requests payment after receiving cargo (pay-on-delivery orders). */
export async function requestPayOnDeliveryPayment(orderId: string, reference: string) {
  const normalized = normalizePaymentProofReference(reference);
  if (!normalized) {
    throw new Error("Andika reference sahihi ya malipo (namba kutoka M-Pesa au SMS).");
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payment: true, user: { select: { locale: true } } },
    });
    if (!order) throw new Error("Oda haipatikani");
    if (order.paymentTiming !== "PAY_ON_DELIVERY") {
      throw new Error("Oda hii si ya kulipia ukifika mzigo");
    }
    if (!order.submittedAt) {
      throw new Error("Oda bado inasubiri idhini ya admin");
    }
    if (!["ON_THE_WAY", "DELIVERED"].includes(order.status)) {
      throw new Error("Omba kulipia baada ya kupokea mzigo wako");
    }
    if (order.payment?.status === "AWAITING_CONFIRMATION") {
      throw new Error("Ombi la malipo tayari limetumwa — subiri uthibitisho");
    }
    if (order.payment?.status === "PAID") {
      throw new Error("Oda hii tayari imelipwa");
    }

    await assertPaymentReferenceAvailable(
      tx,
      normalized,
      order.payment?.id ?? "new",
      order.userId,
      order.user?.locale
    );

    if (order.payment) {
      try {
        return await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "AWAITING_CONFIRMATION", reference: normalized },
        });
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("Payment_proof_reference_unique") ||
            err.message.includes("unique constraint"))
        ) {
          const locale = order.user?.locale === "en" ? "en" : "sw";
          throw new Error(paymentReferenceDuplicateMessage(false, locale));
        }
        throw err;
      }
    }

    try {
      return await tx.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          amount: order.total,
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
        const locale = order.user?.locale === "en" ? "en" : "sw";
        throw new Error(paymentReferenceDuplicateMessage(false, locale));
      }
      throw err;
    }
  });
}

export async function getPayment(paymentId: string) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: { include: { items: true } },
      user: { select: { id: true, name: true, phone: true } },
    },
  });
}

export async function listPayments(
  status?: "PENDING" | "AWAITING_CONFIRMATION" | "PAID" | "FAILED" | "REFUNDED",
  params?: PaginationParams & { q?: string }
) {
  const clauses: Record<string, unknown>[] = [];
  if (status) clauses.push({ status });

  const term = params?.q?.trim();
  if (term) {
    clauses.push({
      OR: [
        { reference: { contains: term, mode: "insensitive" } },
        { orderId: { contains: term, mode: "insensitive" } },
        { user: { phone: { contains: term } } },
        { user: { name: { contains: term, mode: "insensitive" } } },
      ],
    });
  }

  const where = clauses.length ? { AND: clauses } : {};
  const include = {
    order: {
      select: {
        id: true,
        module: true,
        total: true,
        status: true,
        paymentTiming: true,
        submittedAt: true,
      },
    },
    user: { select: { id: true, name: true, phone: true } },
  };

  if (!params?.page && !params?.limit) {
    return prisma.payment.findMany({ where, include, orderBy: { createdAt: "desc" } });
  }

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, skip, take: limit, include, orderBy: { createdAt: "desc" } }),
    prisma.payment.count({ where }),
  ]);
  return paginatedResult(items, total, page, limit);
}
