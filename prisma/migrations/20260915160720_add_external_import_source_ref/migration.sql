-- CreateEnum
CREATE TYPE "ExternalImportSource" AS ENUM ('act_open_data', 'vic_open_data', 'nsw_open_data', 'qld_open_data');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "externalSource" "ExternalImportSource";

-- CreateIndex
CREATE UNIQUE INDEX "Camera_externalSource_externalRef_key" ON "Camera"("externalSource", "externalRef");
