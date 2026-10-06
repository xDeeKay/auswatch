-- A status of "removed" implied a one-way trip. These values describe whether a
-- camera or site is currently operating, which can change back (mobile sites in
-- particular). RENAME VALUE keeps every existing row.
ALTER TYPE "CameraStatus" RENAME VALUE 'removed' TO 'inactive';
ALTER TYPE "HistoryEventType" RENAME VALUE 'removed' TO 'inactive';
