import { prisma } from "@monana/db";
import { genOrderRef, paginatedResult, type PaginationParams } from "@monana/utils";

export async function createPaymentRequest(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Oda haipatikani");

  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing) return existing;

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
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Malipo hayapatikani");
  if (payment.status !== "PENDING") {
    throw new Error(`Malipo tayari ${payment.status}`);
  }
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "AWAITING_CONFIRMATION", reference },
  });
}

export async function confirmPayment(paymentId: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID" },
  });

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: "CONFIRMED" },
  });

  return payment;
}

export async function failPayment(paymentId: string) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED" },
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
    order: { select: { id: true, module: true, total: true, status: true } },
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
