import type {
  AuditActionType,
  AuditEntityType,
  AuState,
  CameraStatus,
  CameraType,
  CaptureType,
  ModerationState,
  ModeratorRole,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import type { GrantCell } from "@/lib/moderator-grants";

/**
 * Dates are stored as ISO strings, not Date instances, since these payloads
 * live in a Prisma Json column and JSON has no native date type. Revert logic
 * (stage 5) is responsible for parsing them back into Date instances before
 * writing them to a DateTime column.
 */
export type CameraLifecyclePayload = { moderationState: ModerationState; status: CameraStatus };

export type CameraStateOverridePayload = { state: AuState | null; stateOverride: boolean };

export type CameraFieldsPayload = Partial<{
  lat: number;
  lng: number;
  state: AuState | null;
  stateOverride: boolean;
  type: CameraType;
  operator: string;
  captures: CaptureType;
  notes: string;
}>;

export type CorrectionStatusPayload = { status: "pending" | "approved" | "rejected"; reviewedAt: string | null };

export type CameraNoteAddPayload = { cameraId: string; authorId: string; body: string };

export type ModeratorProfilePayload = { role: ModeratorRole; grants: GrantCell[] };

export type ModeratorActivePayload = { isActive: boolean; deactivatedAt: string | null };

export type AuditLogPayloadMap = {
  camera_verify: { before: CameraLifecyclePayload; after: CameraLifecyclePayload };
  camera_remove: { before: CameraLifecyclePayload; after: CameraLifecyclePayload };
  camera_state_override: { before: CameraStateOverridePayload; after: CameraStateOverridePayload };
  camera_correction_approve: {
    before: CameraFieldsPayload;
    after: CameraFieldsPayload & { correctionReportId: string; createdSensitiveSiteMatchIds: string[] };
  };
  camera_correction_reject: { before: CorrectionStatusPayload; after: CorrectionStatusPayload };
  camera_note_add: { before: null; after: CameraNoteAddPayload };
  moderator_create: { before: null; after: ModeratorProfilePayload };
  moderator_update: { before: ModeratorProfilePayload; after: ModeratorProfilePayload };
  moderator_deactivate: { before: ModeratorActivePayload; after: ModeratorActivePayload };
  moderator_reactivate: { before: ModeratorActivePayload; after: ModeratorActivePayload };
};

export const AUDIT_ENTITY_BY_ACTION: Record<AuditActionType, AuditEntityType> = {
  camera_verify: "camera",
  camera_remove: "camera",
  camera_state_override: "camera",
  camera_correction_approve: "camera",
  camera_correction_reject: "correction_report",
  camera_note_add: "camera_note",
  moderator_create: "moderator_profile",
  moderator_update: "moderator_profile",
  moderator_deactivate: "moderator_profile",
  moderator_reactivate: "moderator_profile",
};

export type AuditLogEntryCreateInput<A extends AuditActionType = AuditActionType> = {
  entityType: AuditEntityType;
  entityId: string;
  action: A;
  actorId: string;
  before: AuditLogPayloadMap[A]["before"];
  after: AuditLogPayloadMap[A]["after"];
  summary: string;
  moderationActionId?: string;
};

/**
 * Prisma's Json columns require the Prisma.JsonNull sentinel to explicitly
 * write a JSON null, since a plain `null` there means "leave unset." Only
 * needed at the actual .create()/.update() call site, never in the pure
 * builder functions, which deal in plain `null`.
 */
export function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export function buildAuditLogEntry<A extends AuditActionType>(
  action: A,
  entityId: string,
  actorId: string,
  before: AuditLogPayloadMap[A]["before"],
  after: AuditLogPayloadMap[A]["after"],
  summary: string,
  moderationActionId?: string
): AuditLogEntryCreateInput<A> {
  return {
    entityType: AUDIT_ENTITY_BY_ACTION[action],
    entityId,
    action,
    actorId,
    before,
    after,
    summary,
    moderationActionId,
  };
}
