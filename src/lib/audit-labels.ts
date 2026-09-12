import { AuditActionType, AuditEntityType } from "@/generated/prisma/enums";

export const AUDIT_ACTION_LABEL: Record<AuditActionType, string> = {
  [AuditActionType.camera_verify]: "Verified submission",
  [AuditActionType.camera_remove]: "Removed submission",
  [AuditActionType.camera_correction_approve]: "Approved correction",
  [AuditActionType.camera_correction_reject]: "Rejected correction",
  [AuditActionType.camera_state_override]: "Overrode state",
  [AuditActionType.camera_note_add]: "Added note",
  [AuditActionType.moderator_create]: "Added moderator",
  [AuditActionType.moderator_update]: "Updated privileges",
  [AuditActionType.moderator_deactivate]: "Deactivated moderator",
  [AuditActionType.moderator_reactivate]: "Reactivated moderator",
};

export const AUDIT_ENTITY_LABEL: Record<AuditEntityType, string> = {
  [AuditEntityType.camera]: "Camera",
  [AuditEntityType.correction_report]: "Correction",
  [AuditEntityType.camera_note]: "Note",
  [AuditEntityType.moderator_profile]: "Moderator",
};
