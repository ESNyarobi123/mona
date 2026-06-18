-- Delivery pricing: order breakdown + per-zone fees
ALTER TABLE "Order" ADD COLUMN "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
UPDATE "Order" SET "subtotal" = "total" WHERE "subtotal" = 0;

ALTER TABLE "DeliveryZone" ADD COLUMN "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
