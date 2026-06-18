-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" "BusinessModule" NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'WEB',
    "total" DECIMAL(12,2) NOT NULL,
    "payload" JSONB NOT NULL,
    "paymentToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_paymentToken_key" ON "CheckoutIntent"("paymentToken");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_orderId_key" ON "CheckoutIntent"("orderId");

-- CreateIndex
CREATE INDEX "CheckoutIntent_userId_idx" ON "CheckoutIntent"("userId");

-- CreateIndex
CREATE INDEX "CheckoutIntent_expiresAt_idx" ON "CheckoutIntent"("expiresAt");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
