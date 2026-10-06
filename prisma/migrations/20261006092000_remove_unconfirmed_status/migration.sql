-- "Unconfirmed" duplicated the pending moderation state: a record is unconfirmed
-- exactly while it awaits review, and the public only ever sees verified records.
-- Existing unconfirmed records become active (they stay pending and non-public),
-- and audit snapshots that captured the old value are rewritten so showing and
-- reverting an entry still resolves to a valid status.
UPDATE "Camera" SET "status" = 'active' WHERE "status" = 'unconfirmed';
UPDATE "HistoryEvent" SET "eventType" = 'corrected' WHERE "eventType" = 'unconfirmed';

UPDATE "AuditLogEntry"
SET "before" = jsonb_set("before", '{status}', '"active"')
WHERE "before"->>'status' = 'unconfirmed';

UPDATE "AuditLogEntry"
SET "after" = jsonb_set("after", '{status}', '"active"')
WHERE "after"->>'status' = 'unconfirmed';

-- AlterEnum
BEGIN;
CREATE TYPE "CameraStatus_new" AS ENUM ('active', 'inactive');
ALTER TABLE "Camera" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Camera" ALTER COLUMN "status" TYPE "CameraStatus_new" USING ("status"::text::"CameraStatus_new");
ALTER TYPE "CameraStatus" RENAME TO "CameraStatus_old";
ALTER TYPE "CameraStatus_new" RENAME TO "CameraStatus";
DROP TYPE "public"."CameraStatus_old";
ALTER TABLE "Camera" ALTER COLUMN "status" SET DEFAULT 'active';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "HistoryEventType_new" AS ENUM ('added', 'active', 'inactive', 'relocated', 'corrected');
ALTER TABLE "HistoryEvent" ALTER COLUMN "eventType" TYPE "HistoryEventType_new" USING ("eventType"::text::"HistoryEventType_new");
ALTER TYPE "HistoryEventType" RENAME TO "HistoryEventType_old";
ALTER TYPE "HistoryEventType_new" RENAME TO "HistoryEventType";
DROP TYPE "public"."HistoryEventType_old";
COMMIT;
