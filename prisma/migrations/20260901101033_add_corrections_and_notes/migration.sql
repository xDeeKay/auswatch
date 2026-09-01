-- CreateEnum
CREATE TYPE "CorrectionReportStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "HistoryEventType" ADD VALUE 'corrected';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ModerationActionType" ADD VALUE 'correction_approve';
ALTER TYPE "ModerationActionType" ADD VALUE 'correction_reject';

-- AlterTable
ALTER TABLE "ModerationAction" ADD COLUMN     "correctionReportId" TEXT;

-- CreateTable
CREATE TABLE "CorrectionReport" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "status" "CorrectionReportStatus" NOT NULL DEFAULT 'pending',
    "proposedLat" DOUBLE PRECISION,
    "proposedLng" DOUBLE PRECISION,
    "proposedType" "CameraType",
    "proposedOperator" TEXT,
    "proposedCaptures" "CaptureType",
    "proposedNotes" TEXT,
    "reporterNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "proposedSensitiveSiteMatches" JSONB,
    "proposedSensitiveSiteCheckErrors" JSONB,

    CONSTRAINT "CorrectionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraNote" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorrectionReport_cameraId_status_idx" ON "CorrectionReport"("cameraId", "status");

-- CreateIndex
CREATE INDEX "CorrectionReport_reporterId_createdAt_idx" ON "CorrectionReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "CameraNote_cameraId_createdAt_idx" ON "CameraNote"("cameraId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_correctionReportId_idx" ON "ModerationAction"("correctionReportId");

-- AddForeignKey
ALTER TABLE "CorrectionReport" ADD CONSTRAINT "CorrectionReport_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraNote" ADD CONSTRAINT "CameraNote_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraNote" ADD CONSTRAINT "CameraNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_correctionReportId_fkey" FOREIGN KEY ("correctionReportId") REFERENCES "CorrectionReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
