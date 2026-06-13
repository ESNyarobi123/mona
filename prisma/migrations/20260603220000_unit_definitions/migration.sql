-- UnitDefinition table + migrate SaleUnit enum columns to text

CREATE TABLE "UnitDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelSw" TEXT NOT NULL,
    "priceSuffix" TEXT NOT NULL,
    "quantitySuffixEn" TEXT,
    "quantitySuffixSw" TEXT,
    "icon" TEXT,
    "module" "BusinessModule",
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnitDefinition_code_key" ON "UnitDefinition"("code");

INSERT INTO "UnitDefinition" ("id", "code", "labelEn", "labelSw", "priceSuffix", "quantitySuffixEn", "quantitySuffixSw", "icon", "module", "isSystem", "active", "sortOrder", "updatedAt") VALUES
  ('unit_piece', 'PIECE', 'Piece', 'Kipande / Sahani', 'piece', 'piece', 'kipande', '🍽️', NULL, true, true, 10, CURRENT_TIMESTAMP),
  ('unit_kg', 'KG', 'Kilogram', 'Kilo (kg)', 'kg', 'kg', 'kilo', '⚖️', NULL, true, true, 20, CURRENT_TIMESTAMP),
  ('unit_gram', 'GRAM', 'Gram', 'Gramu (g)', 'g', 'g', 'gramu', '⚖️', NULL, true, true, 30, CURRENT_TIMESTAMP),
  ('unit_litre', 'LITRE', 'Litre', 'Lita', 'L', 'L', 'lita', '🥤', NULL, true, true, 40, CURRENT_TIMESTAMP),
  ('unit_portion', 'PORTION', 'Portion', 'Sehemu', 'portion', 'portion', 'sehemu', '🥘', NULL, true, true, 50, CURRENT_TIMESTAMP),
  ('unit_pack', 'PACK', 'Pack', 'Pakiti', 'pack', 'pack', 'pakiti', '📦', NULL, true, true, 60, CURRENT_TIMESTAMP);

ALTER TABLE "Product" ALTER COLUMN "unit" TYPE TEXT USING "unit"::TEXT;
ALTER TABLE "Product" ALTER COLUMN "unit" SET DEFAULT 'PIECE';

ALTER TABLE "MenuItem" ALTER COLUMN "unit" TYPE TEXT USING "unit"::TEXT;
ALTER TABLE "MenuItem" ALTER COLUMN "unit" SET DEFAULT 'PIECE';

ALTER TABLE "OrderItem" ALTER COLUMN "unit" TYPE TEXT USING "unit"::TEXT;
ALTER TABLE "OrderItem" ALTER COLUMN "unit" SET DEFAULT 'PIECE';

DROP TYPE "SaleUnit";
