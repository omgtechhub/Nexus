-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CUSTOMER', 'SELLER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'SELLER',
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "isVerified" SET DEFAULT false;

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "User_accountType_idx" ON "User"("accountType");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- DATA BACKFILL
-- The column default above marks every existing row SELLER, which is wrong for
-- accounts that never had a store. Classify existing users from what the old
-- code used to infer at runtime, then retire that inference.
-- ============================================================================

-- A user with no store membership and no platform role is a customer.
UPDATE "User" u
SET "accountType" = 'CUSTOMER'
WHERE u."platformRole" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "StoreMember" m WHERE m."userId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "Store" s WHERE s."ownerId" = u."id");

-- The legacy `plan = 'customer'` marker was the old customer flag. Honour it
-- even where a store was auto-created by the OAuth bug that has since been fixed.
UPDATE "User"
SET "accountType" = 'CUSTOMER'
WHERE "plan" = 'customer'
  AND "platformRole" IS NULL;

-- Accounts that existed before verification was enforced were implicitly
-- trusted (isVerified defaulted to true). Preserve that so this migration does
-- not lock anyone out, and record when they were grandfathered in.
UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt")
WHERE "isVerified" = true
  AND "emailVerifiedAt" IS NULL;

-- Attach existing per-store CRM records to the global account that shares the
-- email address, so prior purchases appear in the unified customer portal.
UPDATE "Customer" c
SET "userId" = u."id"
FROM "User" u
WHERE c."userId" IS NULL
  AND lower(c."email") = lower(u."email");
