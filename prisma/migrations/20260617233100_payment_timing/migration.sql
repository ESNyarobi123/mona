-- CreateEnum
CREATE TYPE "PaymentTiming" AS ENUM ('PAY_NOW', 'PAY_ON_DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentTiming" "PaymentTiming" NOT NULL DEFAULT 'PAY_NOW',
ADD COLUMN     "submittedAt" TIMESTAMP(3);
