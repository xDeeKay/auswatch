-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ModerationReasonCode" ADD VALUE 'official_dataset';
ALTER TYPE "ModerationReasonCode" ADD VALUE 'public_imagery';
ALTER TYPE "ModerationReasonCode" ADD VALUE 'corroborating_reports';
ALTER TYPE "ModerationReasonCode" ADD VALUE 'moderator_observation';
