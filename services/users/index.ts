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
  imageUrl: true,
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
  imageUrl: true,
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
  data: {
    name?: string;
    email?: string | null;
    phone?: string;
    locale?: "en" | "sw";
    imageUrl?: string | null;
  }
) {
  if (data.phone) {
    const phone = normalizePhone(data.phone);
    const taken = await prisma.user.findFirst({
      where: { phone, NOT: { id } },
    });
    if (taken) throw new UserServiceError("Namba ya simu tayari imesajiliwa.", 409);
    data = { ...data, phone };
  }

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
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.locale !== undefined ? { locale: data.locale } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
    },
    select: userPublicSelect,
  });
}

export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, password: true },
  });
  if (!user) throw new UserServiceError("Mtumiaji hajapatikani", 404);
  if (!user.password) {
    throw new UserServiceError("Akaunti haina password. Weka password mpya kupitia admin.", 400);
  }

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw new UserServiceError("Password ya sasa si sahihi", 400);

  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });

  return { changed: true };
}

const RESET_TTL_MINUTES = 15;
const RESET_COOLDOWN_SECONDS = 60;

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Request WhatsApp OTP for password reset. Always returns ok (no phone enumeration). */
export async function requestPasswordReset(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, locale: true, name: true, password: true },
  });

  if (!user) {
    return {
      ok: true as const,
      sent: false as const,
      messageSw:
        "Ikiwa namba iko kwenye Monana, utapokea msimbo wa WhatsApp hivi karibuni.",
      messageEn:
        "If this number is on Monana, you will receive a WhatsApp code shortly.",
    };
  }

  const recent = await prisma.passwordResetToken.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - RESET_COOLDOWN_SECONDS * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    throw new UserServiceError(
      "Tafadhali subiri kidogo kabla ya kuomba msimbo mwingine.",
      429
    );
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      phone,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt,
    },
  });

  return {
    ok: true as const,
    sent: true as const,
    phone,
    code,
    locale: (user.locale === "sw" ? "sw" : "en") as "en" | "sw",
    name: user.name,
    expiresMinutes: RESET_TTL_MINUTES,
    messageSw:
      "Tumetuma msimbo wa tarakimu 6 kwenye WhatsApp. Ingiza msimbo na weka nywila mpya.",
    messageEn:
      "We sent a 6-digit code on WhatsApp. Enter the code and choose a new password.",
  };
}

export async function resetPasswordWithCode(
  phoneRaw: string,
  code: string,
  newPassword: string
) {
  const phone = normalizePhone(phoneRaw);
  const token = await prisma.passwordResetToken.findFirst({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) {
    throw new UserServiceError("Msimbo umekwisha muda au hauko sahihi. Omba msimbo mpya.", 400);
  }

  const valid = await bcrypt.compare(code.trim(), token.codeHash);
  if (!valid) throw new UserServiceError("Msimbo si sahihi", 400);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: token.userId, usedAt: null, id: { not: token.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { reset: true };
}

export class UserServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
