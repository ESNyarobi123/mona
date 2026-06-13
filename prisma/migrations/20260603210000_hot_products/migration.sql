-- HotPickMode enum
CREATE TYPE "HotPickMode" AS ENUM ('AUTO', 'MANUAL');

CREATE TABLE "HotProductsConfig" (
    "module" "BusinessModule" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "HotPickMode" NOT NULL DEFAULT 'AUTO',
    "maxItems" INTEGER NOT NULL DEFAULT 8,
    "lookbackDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotProductsConfig_pkey" PRIMARY KEY ("module")
);

CREATE TABLE "HotPickManual" (
    "id" TEXT NOT NULL,
    "module" "BusinessModule" NOT NULL,
    "productId" TEXT,
    "menuItemId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotPickManual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotPickManual_productId_key" ON "HotPickManual"("productId");
CREATE UNIQUE INDEX "HotPickManual_menuItemId_key" ON "HotPickManual"("menuItemId");

ALTER TABLE "HotPickManual" ADD CONSTRAINT "HotPickManual_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotPickManual" ADD CONSTRAINT "HotPickManual_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "HotProductsConfig" ("module", "enabled", "mode", "maxItems", "lookbackDays", "updatedAt")
VALUES ('GROCERY', false, 'AUTO', 8, 30, CURRENT_TIMESTAMP),
       ('RESTAURANT', false, 'AUTO', 8, 30, CURRENT_TIMESTAMP)
ON CONFLICT ("module") DO NOTHING;
