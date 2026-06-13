-- Subscription flexibility: upfront payment, pause, basket edit, discounts

ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING_PAYMENT';

ALTER TABLE "GroceryPackage" ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "GroceryPackage" ADD COLUMN "freeDelivery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GroceryPackage" ADD COLUMN "orderCutoffHours" INTEGER NOT NULL DEFAULT 48;

ALTER TABLE "GrocerySubscription" ADD COLUMN "pausedUntil" TIMESTAMP(3);
ALTER TABLE "GrocerySubscription" ADD COLUMN "nextDeliveryItems" JSONB;

UPDATE "GroceryPackage" SET "discountPercent" = 5, "freeDelivery" = true WHERE "kind" = 'MONTHLY_PANTRY';
