-- Grocery tiers: ON_DEMAND vs SUBSCRIPTION + subscription delivery fields

CREATE TYPE "GroceryOrderType" AS ENUM ('ON_DEMAND', 'SUBSCRIPTION');

ALTER TABLE "Order" ADD COLUMN "orderType" "GroceryOrderType";

UPDATE "Order"
SET "orderType" = CASE
  WHEN "module" = 'GROCERY' AND "subscriptionId" IS NOT NULL THEN 'SUBSCRIPTION'::"GroceryOrderType"
  WHEN "module" = 'GROCERY' THEN 'ON_DEMAND'::"GroceryOrderType"
  ELSE NULL
END;

ALTER TABLE "GrocerySubscription" ADD COLUMN "address" TEXT;
ALTER TABLE "GrocerySubscription" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'WEB';
ALTER TABLE "GrocerySubscription" ADD COLUMN "preferredDayOfWeek" INTEGER;
ALTER TABLE "GrocerySubscription" ADD COLUMN "note" TEXT;

UPDATE "GrocerySubscription" SET "address" = 'Anwani haijasajiliwa' WHERE "address" IS NULL;
ALTER TABLE "GrocerySubscription" ALTER COLUMN "address" SET NOT NULL;
