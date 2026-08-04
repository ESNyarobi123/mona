-- CreateEnum
CREATE TYPE "CustomOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RestaurantCustomOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dishName" TEXT NOT NULL,
    "specialRequirements" TEXT,
    "requestedFor" TIMESTAMP(3) NOT NULL,
    "mealSlot" "MealSlot",
    "status" "CustomOrderStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "Channel" NOT NULL DEFAULT 'WEB',
    "address" TEXT,
    "quotedPrice" DECIMAL(12,2),
    "adminNote" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantCustomOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantCustomOrder_orderId_key" ON "RestaurantCustomOrder"("orderId");

-- CreateIndex
CREATE INDEX "RestaurantCustomOrder_userId_status_idx" ON "RestaurantCustomOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "RestaurantCustomOrder_status_requestedFor_idx" ON "RestaurantCustomOrder"("status", "requestedFor");

-- AddForeignKey
ALTER TABLE "RestaurantCustomOrder" ADD CONSTRAINT "RestaurantCustomOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
