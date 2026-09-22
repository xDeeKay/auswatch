-- CreateEnum
CREATE TYPE "PhotoModerationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "CameraPhoto" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "gpsDistanceMeters" DOUBLE PRECISION,
    "capturedAgeHours" DOUBLE PRECISION,
    "moderationStatus" "PhotoModerationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionPhoto" (
    "id" TEXT NOT NULL,
    "correctionReportId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "gpsDistanceMeters" DOUBLE PRECISION,
    "capturedAgeHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CameraPhoto_cameraId_idx" ON "CameraPhoto"("cameraId");

-- CreateIndex
CREATE INDEX "CorrectionPhoto_correctionReportId_idx" ON "CorrectionPhoto"("correctionReportId");

-- AddForeignKey
ALTER TABLE "CameraPhoto" ADD CONSTRAINT "CameraPhoto_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionPhoto" ADD CONSTRAINT "CorrectionPhoto_correctionReportId_fkey" FOREIGN KEY ("correctionReportId") REFERENCES "CorrectionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
