import bcrypt from "bcryptjs";
import { prisma, type Role } from "@monana/db";
import { normalizeTanzaniaPhone, paginatedResult, type PaginationParams } from "@monana/utils";

const userListSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { orders: true, subscriptions: true, payments: true } },
} as const;

const userPublicSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizePhone(phone: string) {
  return normalizeTanzaniaPhone(phone);
}

export async function listUsers(params: PaginationParams & { role?: Role; search?: string }) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { phone: { contains: params.search } },
            { email: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: userListSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResult(items, total, page, limit);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...userPublicSelect,
      wallet: { select: { id: true, balance: true, updatedAt: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          module: true,
          status: true,
          total: true,
          address: true,
          orderType: true,
          channel: true,
          createdAt: true,
          payment: { select: { id: true, status: true, reference: true, amount: true } },
          _count: { select: { items: true } },
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          frequency: true,
          address: true,
          nextRunAt: true,
          preferredDayOfWeek: true,
          preferredDayOfMonth: true,
          createdAt: true,
          package: { select: { id: true, name: true, price: true, kind: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          method: true,
          createdAt: true,
          order: { select: { id: true, module: true, status: true } },
        },
      },
      _count: { select: { orders: true, payments: true, subscriptions: true } },
    },
  });

  return user;
}

export async function createUserAdmin(input: {
  phone: string;
  name: string;
  email?: string | null;
  role?: Role;
  locale?: "en" | "sw";
  password?: string;
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new UserServiceError("Namba ya simu tayari imesajiliwa.", 409);

  if (input.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailTaken) throw new UserServiceError("Barua pepe tayari inatumika.", 409);
  }

  return prisma.user.create({
    data: {
      phone,
      name: input.name,
      email: input.email || null,
      role: input.role ?? "CUSTOMER",
      locale: input.locale ?? "en",
      password: input.password ? await bcrypt.hash(input.password, 10) : undefined,
    },
    select: userListSelect,
  });
}

export async function updateUserAdmin(
  id: string,
  data: {
    name?: string;
    email?: string | null;
    role?: Role;
    locale?: "en" | "sw";
    password?: string;
  }
) {
  if (data.email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (emailTaken) throw new UserServiceError("Barua pepe tayari inatumika.", 409);
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.locale !== undefined ? { locale: data.locale } : {}),
      ...(data.password ? { password: await bcrypt.hash(data.password, 10) } : {}),
    },
    select: userListSelect,
  });
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, _count: { select: { orders: true } } },
  });
  if (!user) throw new UserServiceError("Mtumiaji hajapatikani", 404);

  await prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({ where: { userId: id }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length) {
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { userId: id } });
    }

    await tx.grocerySubscription.deleteMany({ where: { userId: id } });
    await tx.wallet.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  return { deleted: true, ordersRemoved: user._count.orders };
}

export async function updateUserRole(id: string, role: Role) {
  return prisma.user.update({ where: { id }, data: { role }, select: userPublicSelect });
}

export async function updateUserLocale(id: string, locale: "en" | "sw") {
  return prisma.user.update({ where: { id }, data: { locale }, select: userPublicSelect });
}

export async function updateUserProfile(
  id: string,
  data: { name?: string; email?: string | null }
) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
    },
    select: userPublicSelect,
  });
}

export class UserServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
