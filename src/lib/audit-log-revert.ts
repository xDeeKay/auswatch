import type { AuditActionType, AuditEntityType } from "@/generated/prisma/enums";

export type RevertCandidate = { id: string; revertedAt: Date | null };

export type RevertCheck = { ok: true } | { ok: false; message: string };

/**
 * An entry may be reverted only if it hasn't been reverted already, and it's
 * the current head (the most recent entry) for its entity's timeline. This
 * forces reverts to happen in strict reverse-chronological order per entity,
 * so an entity can never land in an undefined intermediate state.
 */
export function assertRevertable(entry: RevertCandidate, headEntryId: string): RevertCheck {
  if (entry.revertedAt !== null) {
    return { ok: false, message: "This action has already been reverted." };
  }
  if (entry.id !== headEntryId) {
    return { ok: false, message: "A later action exists on this record. Revert that one first." };
  }
  return { ok: true };
}

export type RevertibleEntry = {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditActionType;
  before: unknown;
  after: unknown;
};

export type RevertAuditEntryPlan = {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditActionType;
  actorId: string;
  before: unknown;
  after: unknown;
  summary: string;
  revertsEntryId: string;
};

/**
 * Reverting entry X produces a new entry Y with before/after swapped and
 * revertsEntryId pointing at X. Y is just the new head of the same timeline,
 * so reverting Y later (governed by the same assertRevertable rule) restores
 * X's original `after` values - redo, with no special-casing needed.
 */
export function buildRevertAuditEntry(
  original: RevertibleEntry,
  revertingActorId: string
): RevertAuditEntryPlan {
  return {
    entityType: original.entityType,
    entityId: original.entityId,
    action: original.action,
    actorId: revertingActorId,
    before: original.after,
    after: original.before,
    summary: `Reverted a previous action from this record's history.`,
    revertsEntryId: original.id,
  };
}
