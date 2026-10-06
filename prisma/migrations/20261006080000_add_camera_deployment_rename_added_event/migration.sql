-- Rename the first history event from "sighted" to "added": it records when a
-- camera was added to the register, not when it was first seen. RENAME VALUE
-- keeps every existing row.
ALTER TYPE "HistoryEventType" RENAME VALUE 'sighted' TO 'added';

-- CreateEnum
CREATE TYPE "Deployment" AS ENUM ('fixed', 'mobile', 'unknown');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN "deployment" "Deployment" NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "CorrectionReport" ADD COLUMN "proposedDeployment" "Deployment";
