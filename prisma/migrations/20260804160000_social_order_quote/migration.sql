-- AlterEnum: add QUOTED for Social Order RFQ flow
ALTER TYPE "CustomOrderStatus" ADD VALUE IF NOT EXISTS 'QUOTED';

-- AlterTable
ALTER TABLE "RestaurantCustomOrder" ADD COLUMN IF NOT EXISTS "quotedAt" TIMESTAMP(3);
