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

let prisma = globalForPrisma.prisma;

if (isStaleClient(prisma)) {
  void prisma?.$disconnect();
  prisma = undefined;
  globalForPrisma.prisma = undefined;
}

if (!prisma) {
  prisma = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
