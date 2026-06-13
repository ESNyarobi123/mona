-- Grocery market reports: delivery zones, daily run snapshots, packing checks

CREATE TYPE "MarketRunTrigger" AS ENUM ('MANUAL', 'CRON');
CREATE TYPE "MarketRunStatus" AS ENUM ('OPEN', 'LOCKED', 'COMPLETED');

CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameSw" TEXT,
    "keywords" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "deliveryZoneId" TEXT;

CREATE TABLE "GroceryMarketRun" (
    "id" TEXT NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" "MarketRunTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "MarketRunStatus" NOT NULL DEFAULT 'OPEN',
    "lockedAt" TIMESTAMP(3),
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "procurement" JSONB NOT NULL,
    "packing" JSONB NOT NULL,
    "routes" JSONB NOT NULL,
    "includedOrderIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryMarketRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroceryPackingCheck" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryPackingCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroceryMarketRun_deliveryDate_key" ON "GroceryMarketRun"("deliveryDate");
CREATE INDEX "GroceryMarketRun_deliveryDate_idx" ON "GroceryMarketRun"("deliveryDate");
CREATE UNIQUE INDEX "GroceryPackingCheck_runId_orderId_key" ON "GroceryPackingCheck"("runId", "orderId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroceryPackingCheck" ADD CONSTRAINT "GroceryPackingCheck_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GroceryMarketRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroceryPackingCheck" ADD CONSTRAINT "GroceryPackingCheck_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
