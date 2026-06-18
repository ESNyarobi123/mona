import { prisma, type Channel, type MealSlot, type SubscriptionStatus } from "@monana/db";
import { enrollRestaurantMembershipSchema } from "@monana/types";

const ALL_SLOTS: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

export async function assertCanEnrollRestaurantMembership(userId: string) {
  const existing = await prisma.restaurantSubscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "PAUSED", "PENDING_PAYMENT"] },
    },
  });
  if (existing) {
    throw new Error("Tayari una uanachama wa restaurant unaotumika");
  }
}

export async function enrollRestaurantMembership(input: {
  userId: string;
  mealSlots: MealSlot[];
  address?: string;
  channel?: Channel;
}) {
  const data = enrollRestaurantMembershipSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error("Mtumiaji hajapatikani");

  await assertCanEnrollRestaurantMembership(data.userId);

  const mealSlots = [...new Set(data.mealSlots)] as MealSlot[];
  for (const slot of mealSlots) {
    if (!ALL_SLOTS.includes(slot)) throw new Error(`Slot si sahihi: ${slot}`);
  }

  return prisma.restaurantSubscription.create({
    data: {
      userId: data.userId,
      mealSlots,
      address: data.address,
      channel: data.channel ?? "WEB",
      status: "ACTIVE",
    },
    include: { user: { select: { id: true, name: true, phone: true, locale: true } } },
  });
}

export async function listRestaurantMemberships(filters?: {
  userId?: string;
  status?: SubscriptionStatus;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.status) where.status = filters.status;

  return prisma.restaurantSubscription.findMany({
    where,
    include: { user: { select: { id: true, name: true, phone: true, locale: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRestaurantMembershipById(id: string) {
  return prisma.restaurantSubscription.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, phone: true, locale: true } } },
  });
}

export async function pauseRestaurantMembership(id: string, weeks = 1) {
  const sub = await prisma.restaurantSubscription.findUnique({ where: { id } });
  if (!sub) throw new Error("Uanachama haupatikani");
  if (sub.status !== "ACTIVE") throw new Error("Uanachama hauko hai");

  const pausedUntil = new Date();
  pausedUntil.setDate(pausedUntil.getDate() + weeks * 7);

  return prisma.restaurantSubscription.update({
    where: { id },
    data: { status: "PAUSED", pausedUntil },
  });
}

export async function cancelRestaurantMembership(id: string) {
  return prisma.restaurantSubscription.update({
    where: { id },
    data: { status: "CANCELLED", pausedUntil: null },
  });
}

export function getRestaurantMembershipSetup(locale: "en" | "sw" = "en") {
  const slots = [
    { slot: "BREAKFAST" as const, label: locale === "sw" ? "Asubuhi" : "Breakfast", emoji: "🌅" },
    { slot: "LUNCH" as const, label: locale === "sw" ? "Mchana" : "Lunch", emoji: "☀️" },
    { slot: "DINNER" as const, label: locale === "sw" ? "Usiku" : "Dinner", emoji: "🌙" },
  ];
  return {
    slots,
    hint:
      locale === "sw"
        ? "Chagua moja, mbili, au zote tatu. Utapokea ujumbe wa WhatsApp dirisha likifunguka."
        : "Pick one, two, or all three. You'll get a WhatsApp reminder when each order window opens.",
  };
}
