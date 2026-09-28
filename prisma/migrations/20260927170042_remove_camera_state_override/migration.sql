/*
  Warnings:

  - The values [camera_state_override] on the enum `AuditActionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `stateOverride` on the `Camera` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditActionType_new" AS ENUM ('camera_verify', 'camera_remove', 'camera_correction_approve', 'camera_correction_reject', 'camera_note_add', 'moderator_create', 'moderator_update', 'moderator_deactivate', 'moderator_reactivate');
ALTER TABLE "AuditLogEntry" ALTER COLUMN "action" TYPE "AuditActionType_new" USING ("action"::text::"AuditActionType_new");
ALTER TYPE "AuditActionType" RENAME TO "AuditActionType_old";
ALTER TYPE "AuditActionType_new" RENAME TO "AuditActionType";
DROP TYPE "AuditActionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Camera" DROP COLUMN "stateOverride";
