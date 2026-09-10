-- CreateEnum
CREATE TYPE "AuState" AS ENUM ('nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt');

-- CreateEnum
CREATE TYPE "ModeratorRole" AS ENUM ('moderator', 'admin');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "state" "AuState",
ADD COLUMN     "stateOverride" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ModeratorProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "role" "ModeratorRole" NOT NULL DEFAULT 'moderator',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "lastEditedByUserId" TEXT,

    CONSTRAINT "ModeratorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeratorGrant" (
    "id" TEXT NOT NULL,
    "moderatorProfileId" TEXT NOT NULL,
    "state" "AuState" NOT NULL,
    "cameraType" "CameraType" NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canAct" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeratorGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModeratorProfile_email_key" ON "ModeratorProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ModeratorProfile_userId_key" ON "ModeratorProfile"("userId");

-- CreateIndex
CREATE INDEX "ModeratorProfile_isActive_idx" ON "ModeratorProfile"("isActive");

-- CreateIndex
CREATE INDEX "ModeratorProfile_role_idx" ON "ModeratorProfile"("role");

-- CreateIndex
CREATE INDEX "ModeratorGrant_moderatorProfileId_idx" ON "ModeratorGrant"("moderatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ModeratorGrant_moderatorProfileId_state_cameraType_key" ON "ModeratorGrant"("moderatorProfileId", "state", "cameraType");

-- CreateIndex
CREATE INDEX "Camera_state_idx" ON "Camera"("state");

-- AddForeignKey
ALTER TABLE "ModeratorProfile" ADD CONSTRAINT "ModeratorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorProfile" ADD CONSTRAINT "ModeratorProfile_lastEditedByUserId_fkey" FOREIGN KEY ("lastEditedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorGrant" ADD CONSTRAINT "ModeratorGrant_moderatorProfileId_fkey" FOREIGN KEY ("moderatorProfileId") REFERENCES "ModeratorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
