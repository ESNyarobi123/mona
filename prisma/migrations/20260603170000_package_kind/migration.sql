-- Package kinds: Weekly Basket vs Monthly Pantry + delivery scheduling

CREATE TYPE "PackageKind" AS ENUM ('WEEKLY_BASKET', 'MONTHLY_PANTRY');

ALTER TABLE "GroceryPackage" ADD COLUMN "kind" "PackageKind" NOT NULL DEFAULT 'WEEKLY_BASKET';
ALTER TABLE "GroceryPackage" ADD COLUMN "deliveriesPerMonth" INTEGER NOT NULL DEFAULT 1;

UPDATE "GroceryPackage" SET "kind" = 'MONTHLY_PANTRY', "deliveriesPerMonth" = 1
WHERE "name" ILIKE '%mwezi%';

ALTER TABLE "GrocerySubscription" ADD COLUMN "preferredDayOfMonth" INTEGER;
ALTER TABLE "GrocerySubscription" ADD COLUMN "secondaryDayOfMonth" INTEGER;
ALTER TABLE "GrocerySubscription" ADD COLUMN "deliveriesPerMonth" INTEGER NOT NULL DEFAULT 1;
