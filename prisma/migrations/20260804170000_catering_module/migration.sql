-- AlterEnum
ALTER TYPE "BusinessModule" ADD VALUE IF NOT EXISTS 'CATERING';

-- CreateEnum
CREATE TYPE "CateringEventType" AS ENUM ('WEDDING', 'SEND_OFF', 'CORPORATE', 'BIRTHDAY', 'FUNERAL', 'OTHER');
CREATE TYPE "CateringRequestKind" AS ENUM ('PACKAGE', 'CUSTOM_QUOTE');
CREATE TYPE "CateringRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "CateringPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameSw" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionSw" TEXT NOT NULL,
    "pricePerHead" DECIMAL(12,2) NOT NULL,
    "minGuests" INTEGER NOT NULL DEFAULT 10,
    "maxGuests" INTEGER,
    "featuresEn" TEXT[],
    "featuresSw" TEXT[],
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CateringPackage_code_key" ON "CateringPackage"("code");

CREATE TABLE "CateringRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CateringRequestKind" NOT NULL,
    "packageId" TEXT,
    "eventType" "CateringEventType" NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "specialRequirements" TEXT,
    "status" "CateringRequestStatus" NOT NULL DEFAULT 'PENDING',
    "pricePerHead" DECIMAL(12,2),
    "quotedPrice" DECIMAL(12,2),
    "adminNote" TEXT,
    "orderId" TEXT,
    "quotedAt" TIMESTAMP(3),
    "channel" "Channel" NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CateringRequest_orderId_key" ON "CateringRequest"("orderId");
CREATE INDEX "CateringRequest_userId_status_idx" ON "CateringRequest"("userId", "status");
CREATE INDEX "CateringRequest_status_eventAt_idx" ON "CateringRequest"("status", "eventAt");
CREATE INDEX "CateringRequest_kind_status_idx" ON "CateringRequest"("kind", "status");

ALTER TABLE "CateringRequest" ADD CONSTRAINT "CateringRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CateringRequest" ADD CONSTRAINT "CateringRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CateringPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
