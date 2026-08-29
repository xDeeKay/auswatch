-- CreateEnum
CREATE TYPE "CameraType" AS ENUM ('alpr', 'facial', 'cctv', 'speed', 'other');

-- CreateEnum
CREATE TYPE "CaptureType" AS ENUM ('plates', 'faces', 'both', 'general', 'unclear');

-- CreateEnum
CREATE TYPE "CameraStatus" AS ENUM ('active', 'removed', 'unconfirmed');

-- CreateEnum
CREATE TYPE "ModerationState" AS ENUM ('pending', 'verified', 'disputed', 'removed');

-- CreateEnum
CREATE TYPE "HistoryEventType" AS ENUM ('sighted', 'active', 'removed', 'unconfirmed', 'relocated');

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "type" "CameraType" NOT NULL,
    "operator" TEXT NOT NULL,
    "captures" "CaptureType" NOT NULL,
    "status" "CameraStatus" NOT NULL DEFAULT 'unconfirmed',
    "notes" TEXT NOT NULL DEFAULT '',
    "reporterId" TEXT NOT NULL,
    "moderationState" "ModerationState" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryEvent" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "eventType" "HistoryEventType" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "HistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Camera_status_idx" ON "Camera"("status");

-- CreateIndex
CREATE INDEX "Camera_moderationState_idx" ON "Camera"("moderationState");

-- CreateIndex
CREATE INDEX "Camera_type_idx" ON "Camera"("type");

-- CreateIndex
CREATE INDEX "HistoryEvent_cameraId_idx" ON "HistoryEvent"("cameraId");

-- AddForeignKey
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;
