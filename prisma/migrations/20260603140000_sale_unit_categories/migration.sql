-- SaleUnit + categories on menu items + decimal quantities

CREATE TYPE "SaleUnit" AS ENUM ('PIECE', 'KG', 'GRAM', 'LITRE', 'PORTION', 'PACK');

ALTER TABLE "Product" ADD COLUMN "unit" "SaleUnit" NOT NULL DEFAULT 'PIECE';

ALTER TABLE "MenuItem" ADD COLUMN "unit" "SaleUnit" NOT NULL DEFAULT 'PIECE';
ALTER TABLE "MenuItem" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "unit" "SaleUnit" NOT NULL DEFAULT 'PIECE';
ALTER TABLE "OrderItem" ALTER COLUMN "quantity" TYPE DECIMAL(10,3) USING "quantity"::decimal;
ALTER TABLE "OrderItem" ALTER COLUMN "quantity" SET DEFAULT 1;
