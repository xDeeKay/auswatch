import { AuditActionType, ModeratorRole } from "@/generated/prisma/enums";
import type { ModeratorGrantModel } from "@/generated/prisma/models";
import type { GrantCell } from "@/lib/moderator-grants";
import { buildAuditLogEntry, type AuditLogEntryCreateInput } from "@/lib/audit-log-payloads";

export function toGrantCells(grants: ModeratorGrantModel[]): GrantCell[] {
  return grants.map((g) => ({ state: g.state, cameraType: g.cameraType, canView: g.canView, canAct: g.canAct }));
}

export function buildModeratorCreateAuditEntry(
  profileId: string,
  actorId: string,
  email: string,
  role: ModeratorRole,
  grants: GrantCell[]
): AuditLogEntryCreateInput<"moderator_create"> {
  return buildAuditLogEntry(
    AuditActionType.moderator_create,
    profileId,
    actorId,
    null,
    { role, grants },
    `Added ${email} as ${role === ModeratorRole.admin ? "an admin" : "a moderator"}.`
  );
}

export function buildModeratorUpdateAuditEntry(
  profileId: string,
  actorId: string,
  before: { role: ModeratorRole; grants: GrantCell[] },
  after: { role: ModeratorRole; grants: GrantCell[] }
): AuditLogEntryCreateInput<"moderator_update"> {
  const roleChanged = before.role !== after.role;
  const summary = roleChanged
    ? `Changed role from ${before.role} to ${after.role}.`
    : "Updated grant privileges.";
  return buildAuditLogEntry(AuditActionType.moderator_update, profileId, actorId, before, after, summary);
}

export function buildModeratorDeactivateAuditEntry(
  profileId: string,
  actorId: string,
  now: Date = new Date()
): AuditLogEntryCreateInput<"moderator_deactivate"> {
  return buildAuditLogEntry(
    AuditActionType.moderator_deactivate,
    profileId,
    actorId,
    { isActive: true, deactivatedAt: null },
    { isActive: false, deactivatedAt: now.toISOString() },
    "Deactivated this moderator's access."
  );
}

export function buildModeratorReactivateAuditEntry(
  profileId: string,
  actorId: string,
  deactivatedAtBefore: Date | null
): AuditLogEntryCreateInput<"moderator_reactivate"> {
  return buildAuditLogEntry(
    AuditActionType.moderator_reactivate,
    profileId,
    actorId,
    { isActive: false, deactivatedAt: deactivatedAtBefore ? deactivatedAtBefore.toISOString() : null },
    { isActive: true, deactivatedAt: null },
    "Reactivated this moderator's access."
  );
}
