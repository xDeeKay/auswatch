import type { AuState, CameraStatus, CameraType, CaptureType, ModerationState } from "@/generated/prisma/enums";
import { ModeratorRole } from "@/generated/prisma/enums";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { STATUS_LABEL, TYPE_LABEL, CAPTURE_LABEL } from "@/lib/camera-labels";
import { MODERATION_STATE_LABEL } from "@/lib/moderation-labels";
import { summarizeGrants } from "@/lib/moderator-grants";
import type { ModeratorGrantModel } from "@/generated/prisma/models";

const FIELD_LABEL: Record<string, string> = {
  moderationState: "Moderation state",
  status: "Status",
  state: "State",
  stateOverride: "Manually set",
  lat: "Latitude",
  lng: "Longitude",
  type: "Type",
  operator: "Operator",
  captures: "Captures",
  notes: "Notes",
  role: "Role",
  grants: "Grants",
  isActive: "Active",
  deactivatedAt: "Deactivated at",
  reviewedAt: "Reviewed at",
  body: "Note text",
  email: "Email",
  cameraId: "Camera",
  authorId: "Author",
  correctionReportId: "Correction",
  createdSensitiveSiteMatchIds: "New sensitive-site matches",
};

function formatScalar(key: string, value: unknown): string {
  if (value === null || value === undefined) return key === "state" ? "Unresolved" : "(none)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "state" && typeof value === "string") return STATE_LABEL[value as AuState] ?? value;
  if (key === "status" && typeof value === "string" && value in STATUS_LABEL) {
    return STATUS_LABEL[value as CameraStatus];
  }
  if (key === "moderationState" && typeof value === "string") {
    return MODERATION_STATE_LABEL[value as ModerationState] ?? value;
  }
  if (key === "type" && typeof value === "string" && value in TYPE_LABEL) return TYPE_LABEL[value as CameraType];
  if (key === "captures" && typeof value === "string") return CAPTURE_LABEL[value as CaptureType] ?? value;
  if (key === "role" && typeof value === "string") return value === ModeratorRole.admin ? "Admin" : "Moderator";
  if (key === "grants" && Array.isArray(value)) {
    return value.length === 0 ? "No access granted" : summarizeGrants(value as unknown as ModeratorGrantModel[]);
  }
  if ((key === "deactivatedAt" || key === "reviewedAt") && typeof value === "string") {
    return new Date(value).toLocaleString("en-AU");
  }
  if (Array.isArray(value)) return value.length === 0 ? "(none)" : value.join(", ");
  return String(value);
}

export type AuditPayloadRow = { key: string; label: string; text: string };

/** Flattens a before/after JSON payload into human-readable rows for the audit log diff table. */
export function formatAuditPayload(value: unknown): AuditPayloadRow[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return [{ key: "value", label: "Value", text: String(value) }];
  return Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
    key,
    label: FIELD_LABEL[key] ?? key,
    text: formatScalar(key, v),
  }));
}
