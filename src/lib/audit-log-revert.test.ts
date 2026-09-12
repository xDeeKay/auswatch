import { describe, it, expect } from "vitest";
import { assertRevertable, buildRevertAuditEntry } from "./audit-log-revert";

describe("assertRevertable", () => {
  it("allows reverting when the entry is the head and not yet reverted", () => {
    const result = assertRevertable({ id: "entry-1", revertedAt: null }, "entry-1");
    expect(result).toEqual({ ok: true });
  });

  it("rejects an entry that has already been reverted", () => {
    const result = assertRevertable({ id: "entry-1", revertedAt: new Date() }, "entry-1");
    expect(result.ok).toBe(false);
  });

  it("rejects an entry that is not the current head of its entity's timeline", () => {
    const result = assertRevertable({ id: "entry-1", revertedAt: null }, "entry-2");
    expect(result.ok).toBe(false);
  });

  it("allows reverting a revert entry (the redo case), since it's just the new head", () => {
    const result = assertRevertable({ id: "revert-entry-1", revertedAt: null }, "revert-entry-1");
    expect(result).toEqual({ ok: true });
  });
});

describe("buildRevertAuditEntry", () => {
  const original = {
    id: "entry-1",
    entityType: "camera" as const,
    entityId: "cam-1",
    action: "camera_verify" as const,
    before: { moderationState: "pending", status: "unconfirmed" },
    after: { moderationState: "verified", status: "active" },
  };

  it("swaps before and after", () => {
    const plan = buildRevertAuditEntry(original, "admin-1");
    expect(plan.before).toEqual(original.after);
    expect(plan.after).toEqual(original.before);
  });

  it("preserves the entity and action, attributes the revert to the reverting admin", () => {
    const plan = buildRevertAuditEntry(original, "admin-1");
    expect(plan.entityType).toBe("camera");
    expect(plan.entityId).toBe("cam-1");
    expect(plan.action).toBe("camera_verify");
    expect(plan.actorId).toBe("admin-1");
    expect(plan.revertsEntryId).toBe("entry-1");
  });

  it("summary contains no em-dash", () => {
    const plan = buildRevertAuditEntry(original, "admin-1");
    expect(plan.summary).not.toContain("—");
  });

  it("reverting a revert entry restores the original's after values (redo)", () => {
    const revertPlan = buildRevertAuditEntry(original, "admin-1");
    const revertEntryAsRevertible = {
      id: "revert-entry-1",
      entityType: revertPlan.entityType,
      entityId: revertPlan.entityId,
      action: revertPlan.action,
      before: revertPlan.before,
      after: revertPlan.after,
    };
    const redoPlan = buildRevertAuditEntry(revertEntryAsRevertible, "admin-2");
    expect(redoPlan.after).toEqual(original.after);
    expect(redoPlan.before).toEqual(original.before);
  });
});
