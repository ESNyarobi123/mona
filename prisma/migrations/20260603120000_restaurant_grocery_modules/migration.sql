-- Monana: split Monana Food (RESTAURANT) vs Monana Market / Grocery (GROCERY)
-- Shared: User, Order, Payment, Wallet, Notification (via services)

-- New enums
CREATE TYPE "BusinessModule" AS ENUM ('RESTAURANT', 'GROCERY');
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');
CREATE TYPE "KitchenQueueStatus" AS ENUM ('WAITING', 'COOKING', 'READY', 'SERVED');
CREATE TYPE "SubscriptionFrequency" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- Category: type -> module
ALTER TABLE "Category" ADD COLUMN "module" "BusinessModule";
UPDATE "Category" SET "module" = CASE WHEN "type"::text = 'FOOD' THEN 'RESTAURANT'::"BusinessModule" ELSE 'GROCERY'::"BusinessModule" END;
ALTER TABLE "Category" ALTER COLUMN "module" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "module" SET DEFAULT 'GROCERY';
ALTER TABLE "Category" DROP COLUMN "type";

-- Product: type -> module
ALTER TABLE "Product" ADD COLUMN "module" "BusinessModule";
UPDATE "Product" SET "module" = CASE WHEN "type"::text = 'FOOD' THEN 'RESTAURANT'::"BusinessModule" ELSE 'GROCERY'::"BusinessModule" END;
ALTER TABLE "Product" ALTER COLUMN "module" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "module" SET DEFAULT 'GROCERY';
ALTER TABLE "Product" DROP COLUMN "type";

-- Order: type -> module + restaurant/grocery fields
ALTER TABLE "Order" ADD COLUMN "module" "BusinessModule";
UPDATE "Order" SET "module" = CASE WHEN "type"::text = 'FOOD' THEN 'RESTAURANT'::"BusinessModule" ELSE 'GROCERY'::"BusinessModule" END;
ALTER TABLE "Order" ALTER COLUMN "module" SET NOT NULL;
ALTER TABLE "Order" DROP COLUMN "type";
ALTER TABLE "Order" ADD COLUMN "mealSlot" "MealSlot";
ALTER TABLE "Order" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "scheduledFor" TIMESTAMP(3);

-- OrderItem: add name + optional menuItem
ALTER TABLE "OrderItem" ADD COLUMN "name" TEXT;
UPDATE "OrderItem" oi SET "name" = p."name" FROM "Product" p WHERE p."id" = oi."productId";
ALTER TABLE "OrderItem" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "menuItemId" TEXT;

-- Grocery module tables
CREATE TABLE "GroceryPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "items" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroceryPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrocerySubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "frequency" "SubscriptionFrequency" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GrocerySubscription_pkey" PRIMARY KEY ("id")
);

-- Restaurant module tables
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "imageUrl" TEXT,
    "mealSlots" "MealSlot"[],
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenQueue" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "mealSlot" "MealSlot" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "KitchenQueueStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitchenQueue_pkey" PRIMARY KEY ("id")
);

-- FKs
ALTER TABLE "GrocerySubscription" ADD CONSTRAINT "GrocerySubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrocerySubscription" ADD CONSTRAINT "GrocerySubscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "GroceryPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "GrocerySubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KitchenQueue" ADD CONSTRAINT "KitchenQueue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "KitchenQueue_orderId_key" ON "KitchenQueue"("orderId");

DROP TYPE "OrderType";
