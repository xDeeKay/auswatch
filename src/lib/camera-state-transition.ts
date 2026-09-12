import { AuState, AuditActionType, HistoryEventType } from "@/generated/prisma/enums";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { buildAuditLogEntry, type AuditLogEntryCreateInput } from "@/lib/audit-log-payloads";

export type StateOverrideInput = {
  cameraId: string;
  actorId: string;
  stateBefore: AuState | null;
  stateOverrideBefore: boolean;
  newState: AuState | null;
};

export type StateOverrideTransitionPlan = {
  cameraUpdate: { state: AuState | null; stateOverride: true };
  historyEvent: { cameraId: string; date: Date; eventType: HistoryEventType; note: string };
  auditLogEntry: AuditLogEntryCreateInput<"camera_state_override">;
};

export function buildStateOverrideTransition(
  input: StateOverrideInput,
  now: Date = new Date()
): StateOverrideTransitionPlan {
  const beforeLabel = input.stateBefore ? STATE_LABEL[input.stateBefore] : "Unresolved";
  const afterLabel = input.newState ? STATE_LABEL[input.newState] : "Unresolved";

  return {
    cameraUpdate: { state: input.newState, stateOverride: true },
    historyEvent: {
      cameraId: input.cameraId,
      date: now,
      eventType: HistoryEventType.corrected,
      note: `State manually set to ${afterLabel} (was ${beforeLabel}).`,
    },
    auditLogEntry: buildAuditLogEntry(
      AuditActionType.camera_state_override,
      input.cameraId,
      input.actorId,
      { state: input.stateBefore, stateOverride: input.stateOverrideBefore },
      { state: input.newState, stateOverride: true },
      `State manually set to ${afterLabel} (was ${beforeLabel}).`
    ),
  };
}
