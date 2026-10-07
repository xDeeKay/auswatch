-- A correction now proposes the camera's full status (active or inactive), so a
-- site that has come back can be reported as well as one that has stopped.
-- Earlier "no longer there" reports become proposals of inactive.
ALTER TABLE "CorrectionReport" ADD COLUMN "proposedStatus" "CameraStatus";

UPDATE "CorrectionReport" SET "proposedStatus" = 'inactive' WHERE "reportedRemoved" = true;

ALTER TABLE "CorrectionReport" DROP COLUMN "reportedRemoved";
