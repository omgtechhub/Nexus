-- CreateEnum
CREATE TYPE "VoicePortal" AS ENUM ('SELLER', 'CUSTOMER', 'ADMIN');

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portal" "VoicePortal" NOT NULL,
    "centroid" JSONB NOT NULL,
    "anchors" JSONB NOT NULL DEFAULT '[]',
    "threshold" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "embedder" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isNeural" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceProfile_userId_idx" ON "VoiceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceProfile_userId_portal_key" ON "VoiceProfile"("userId", "portal");

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
