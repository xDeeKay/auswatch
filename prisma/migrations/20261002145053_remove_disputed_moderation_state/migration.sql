-- AlterEnum
BEGIN;
CREATE TYPE "ModerationState_new" AS ENUM ('pending', 'verified', 'removed');
ALTER TABLE "public"."Camera" ALTER COLUMN "moderationState" DROP DEFAULT;
ALTER TABLE "Camera" ALTER COLUMN "moderationState" TYPE "ModerationState_new" USING ("moderationState"::text::"ModerationState_new");
ALTER TYPE "ModerationState" RENAME TO "ModerationState_old";
ALTER TYPE "ModerationState_new" RENAME TO "ModerationState";
DROP TYPE "public"."ModerationState_old";
ALTER TABLE "Camera" ALTER COLUMN "moderationState" SET DEFAULT 'pending';
COMMIT;
