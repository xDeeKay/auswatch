import { describe, it, expect } from "vitest";
import { buildStateOverrideTransition } from "./camera-state-transition";
import { AuState } from "@/generated/prisma/enums";

const now = new Date("2026-09-12T00:00:00.000Z");

describe("buildStateOverrideTransition", () => {
  it("sets state and stateOverride to true for a normal override", () => {
    const plan = buildStateOverrideTransition(
      {
        cameraId: "cam-1",
        actorId: "user-1",
        stateBefore: AuState.nsw,
        stateOverrideBefore: false,
        newState: AuState.vic,
      },
      now
    );
    expect(plan.cameraUpdate).toEqual({ state: AuState.vic, stateOverride: true });
  });

  it("records the before/after state in the audit entry", () => {
    const plan = buildStateOverrideTransition(
      {
        cameraId: "cam-1",
        actorId: "user-1",
        stateBefore: AuState.nsw,
        stateOverrideBefore: false,
        newState: AuState.vic,
      },
      now
    );
    expect(plan.auditLogEntry).toEqual({
      entityType: "camera",
      entityId: "cam-1",
      action: "camera_state_override",
      actorId: "user-1",
      before: { state: AuState.nsw, stateOverride: false },
      after: { state: AuState.vic, stateOverride: true },
      summary: "State manually set to Victoria (was New South Wales).",
      moderationActionId: undefined,
    });
  });

  it("appends a history event describing the change", () => {
    const plan = buildStateOverrideTransition(
      {
        cameraId: "cam-1",
        actorId: "user-1",
        stateBefore: AuState.nsw,
        stateOverrideBefore: false,
        newState: AuState.vic,
      },
      now
    );
    expect(plan.historyEvent.note).toBe("State manually set to Victoria (was New South Wales).");
    expect(plan.historyEvent.cameraId).toBe("cam-1");
    expect(plan.historyEvent.date).toBe(now);
  });

  it("handles overriding to Unresolved (null state)", () => {
    const plan = buildStateOverrideTransition(
      {
        cameraId: "cam-1",
        actorId: "user-1",
        stateBefore: AuState.nsw,
        stateOverrideBefore: false,
        newState: null,
      },
      now
    );
    expect(plan.cameraUpdate).toEqual({ state: null, stateOverride: true });
    expect(plan.auditLogEntry.after).toEqual({ state: null, stateOverride: true });
    expect(plan.historyEvent.note).toBe("State manually set to Unresolved (was New South Wales).");
  });

  it("handles a prior state that was already Unresolved", () => {
    const plan = buildStateOverrideTransition(
      {
        cameraId: "cam-1",
        actorId: "user-1",
        stateBefore: null,
        stateOverrideBefore: false,
        newState: AuState.qld,
      },
      now
    );
    expect(plan.auditLogEntry.before).toEqual({ state: null, stateOverride: false });
    expect(plan.historyEvent.note).toBe("State manually set to Queensland (was Unresolved).");
  });
});
