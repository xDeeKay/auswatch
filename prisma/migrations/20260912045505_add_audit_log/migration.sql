-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('camera', 'correction_report', 'camera_note', 'moderator_profile');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('camera_verify', 'camera_remove', 'camera_correction_approve', 'camera_correction_reject', 'camera_state_override', 'camera_note_add', 'moderator_create', 'moderator_update', 'moderator_deactivate', 'moderator_reactivate');

-- AlterTable
ALTER TABLE "CameraNote" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditActionType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderationActionId" TEXT,
    "revertsEntryId" TEXT,
    "revertedAt" TIMESTAMP(3),
    "revertedByUserId" TEXT,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLogEntry_moderationActionId_key" ON "AuditLogEntry"("moderationActionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLogEntry_revertsEntryId_key" ON "AuditLogEntry"("revertsEntryId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_entityType_entityId_createdAt_idx" ON "AuditLogEntry"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_actorId_idx" ON "AuditLogEntry"("actorId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_revertedAt_idx" ON "AuditLogEntry"("revertedAt");

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_moderationActionId_fkey" FOREIGN KEY ("moderationActionId") REFERENCES "ModerationAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_revertsEntryId_fkey" FOREIGN KEY ("revertsEntryId") REFERENCES "AuditLogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_revertedByUserId_fkey" FOREIGN KEY ("revertedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
