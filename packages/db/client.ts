import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

/** After `prisma migrate` + `generate`, hot-reload may keep an old client missing new models. */
function isStaleClient(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  return typeof client.groceryMarketRun === "undefined";
}

function getPrismaClient(): PrismaClient {
  let client = globalForPrisma.prisma;

  if (isStaleClient(client)) {
    void client?.$disconnect();
    client = undefined;
    globalForPrisma.prisma = undefined;
  }

  if (!client) {
    client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
  }

  return client;
}

export const prisma = getPrismaClient();
