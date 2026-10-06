-- Audit entries store a camera's status inside their JSON snapshots. Rewrite the
-- renamed value so displaying an entry and reverting it still resolve to a valid
-- status. Only the status key changes; moderationState keeps its own "removed".
UPDATE "AuditLogEntry"
SET "before" = jsonb_set("before", '{status}', '"inactive"')
WHERE "before"->>'status' = 'removed';

UPDATE "AuditLogEntry"
SET "after" = jsonb_set("after", '{status}', '"inactive"')
WHERE "after"->>'status' = 'removed';
