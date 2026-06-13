import { prisma } from "@monana/db";

/** Block duplicate enroll while customer has ACTIVE or unpaid PENDING_PAYMENT sub. */
export async function assertCanEnrollNewSubscription(userId: string) {
  const blocking = await prisma.grocerySubscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
    include: { package: true },
  });
  if (!blocking) return;

  if (blocking.status === "PENDING_PAYMENT") {
    throw new Error("Una usajili unasubiri malipo. Lipa kwanza au andika *menu* → Grocery.");
  }
  throw new Error("Tayari una usajili unaotumika. Andika *hariri* kubadilisha kikapu au *sitisha*.");
}
