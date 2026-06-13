import { prisma, type MealSlot, type KitchenQueueStatus } from "@monana/db";

// Kitchen prep queue for restaurant daily orders.

export async function enqueueKitchen(orderId: string, mealSlot: MealSlot) {
  const max = await prisma.kitchenQueue.aggregate({
    _max: { position: true },
    where: { mealSlot, status: { in: ["WAITING", "COOKING"] } },
  });
  const position = (max._max.position ?? 0) + 1;
  return prisma.kitchenQueue.create({
    data: { orderId, mealSlot, position },
  });
}

export async function listKitchenQueue(mealSlot?: MealSlot) {
  return prisma.kitchenQueue.findMany({
    where: mealSlot ? { mealSlot } : undefined,
    include: { order: { include: { user: true, items: true } } },
    orderBy: [{ mealSlot: "asc" }, { position: "asc" }],
  });
}

export async function updateKitchenStatus(queueId: string, status: KitchenQueueStatus) {
  return prisma.kitchenQueue.update({ where: { id: queueId }, data: { status } });
}
