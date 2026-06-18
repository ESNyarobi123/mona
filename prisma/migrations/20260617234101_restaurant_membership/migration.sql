-- CreateTable
CREATE TABLE "RestaurantSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealSlots" "MealSlot"[],
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "channel" "Channel" NOT NULL DEFAULT 'WEB',
    "pausedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantSlotReminderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "eatDate" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantSlotReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestaurantSubscription_userId_status_idx" ON "RestaurantSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "RestaurantSlotReminderLog_eatDate_slot_idx" ON "RestaurantSlotReminderLog"("eatDate", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantSlotReminderLog_userId_slot_eatDate_key" ON "RestaurantSlotReminderLog"("userId", "slot", "eatDate");

-- AddForeignKey
ALTER TABLE "RestaurantSubscription" ADD CONSTRAINT "RestaurantSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
