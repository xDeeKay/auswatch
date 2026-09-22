-- CreateEnum
CREATE TYPE "OperatorCategory" AS ENUM ('state_police', 'local_council', 'transport_authority', 'private', 'unknown');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "operatorCategory" "OperatorCategory" NOT NULL DEFAULT 'unknown',
ALTER COLUMN "operator" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CorrectionReport" ADD COLUMN     "proposedOperatorCategory" "OperatorCategory";
