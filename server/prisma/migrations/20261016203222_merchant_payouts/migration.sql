-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('MANUAL', 'PROVIDER_TRANSFER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "merchantNetAmount" DOUBLE PRECISION,
ADD COLUMN     "platformFeeAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MerchantPayoutAccount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumberLast4" TEXT NOT NULL,
    "providerRecipientId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PayoutMethod" NOT NULL DEFAULT 'MANUAL',
    "providerReference" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "note" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPayoutAccount_storeId_key" ON "MerchantPayoutAccount"("storeId");

-- CreateIndex
CREATE INDEX "MerchantPayoutAccount_storeId_idx" ON "MerchantPayoutAccount"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_reference_key" ON "Payout"("reference");

-- CreateIndex
CREATE INDEX "Payout_storeId_idx" ON "Payout"("storeId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- AddForeignKey
ALTER TABLE "MerchantPayoutAccount" ADD CONSTRAINT "MerchantPayoutAccount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
