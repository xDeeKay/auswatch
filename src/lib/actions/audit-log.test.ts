import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuState, CameraType, ModeratorRole } from "@/generated/prisma/enums";
import type { ModeratorProfileWithGrants } from "@/lib/moderator-access";

const authMock = vi.fn();
const moderatorProfileFindUniqueMock = vi.fn();
const moderatorProfileUpdateMock = vi.fn();
const moderatorProfileCountMock = vi.fn();
const moderatorGrantDeleteManyMock = vi.fn();
const moderatorGrantUpdateMock = vi.fn();
const moderatorGrantCreateManyMock = vi.fn();
const auditLogEntryFindUniqueMock = vi.fn();
const auditLogEntryFindFirstMock = vi.fn();
const auditLogEntryUpdateManyMock = vi.fn();
const auditLogEntryCreateMock = vi.fn();
const cameraUpdateMock = vi.fn();
const historyEventCreateMock = vi.fn();
const correctionReportUpdateMock = vi.fn();
const correctionReportUpdateManyMock = vi.fn();
const cameraNoteUpdateMock = vi.fn();

const txClient = {
  auditLogEntry: {
    findUnique: (...args: unknown[]) => auditLogEntryFindUniqueMock(...args),
    findFirst: (...args: unknown[]) => auditLogEntryFindFirstMock(...args),
    updateMany: (...args: unknown[]) => auditLogEntryUpdateManyMock(...args),
    create: (...args: unknown[]) => auditLogEntryCreateMock(...args),
  },
  camera: { update: (...args: unknown[]) => cameraUpdateMock(...args) },
  historyEvent: { create: (...args: unknown[]) => historyEventCreateMock(...args) },
  correctionReport: {
    update: (...args: unknown[]) => correctionReportUpdateMock(...args),
    updateMany: (...args: unknown[]) => correctionReportUpdateManyMock(...args),
  },
  cameraNote: { update: (...args: unknown[]) => cameraNoteUpdateMock(...args) },
  moderatorProfile: {
    findUnique: (...args: unknown[]) => moderatorProfileFindUniqueMock(...args),
    update: (...args: unknown[]) => moderatorProfileUpdateMock(...args),
  },
  moderatorGrant: {
    deleteMany: (...args: unknown[]) => moderatorGrantDeleteManyMock(...args),
    update: (...args: unknown[]) => moderatorGrantUpdateMock(...args),
    createMany: (...args: unknown[]) => moderatorGrantCreateManyMock(...args),
  },
};

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    moderatorProfile: {
      findUnique: (...args: unknown[]) => moderatorProfileFindUniqueMock(...args),
      count: (...args: unknown[]) => moderatorProfileCountMock(...args),
    },
    $transaction: (fn: (tx: typeof txClient) => unknown) => fn(txClient),
  },
}));

const { revertAuditLogEntry } = await import("./audit-log");

function adminProfile(overrides: Partial<ModeratorProfileWithGrants> = {}): ModeratorProfileWithGrants {
  return {
    id: "admin-profile-1",
    email: "admin@example.com",
    userId: "admin-user-1",
    role: ModeratorRole.admin,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deactivatedAt: null,
    lastEditedByUserId: null,
    grants: [],
    ...overrides,
  };
}

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    entityType: "camera",
    entityId: "cam-1",
    action: "camera_verify",
    actorId: "mod-user-1",
    before: { moderationState: "pending", status: "unconfirmed" },
    after: { moderationState: "verified", status: "active" },
    summary: "Verified this submission.",
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    revertedAt: null,
    revertedByUserId: null,
    moderationActionId: null,
    revertsEntryId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin-user-1" } });
  moderatorProfileFindUniqueMock.mockResolvedValueOnce(adminProfile());
  auditLogEntryUpdateManyMock.mockResolvedValue({ count: 1 });
});

describe("revertAuditLogEntry", () => {
  it("rejects when the signed-in actor is not an admin", async () => {
    moderatorProfileFindUniqueMock.mockReset();
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(adminProfile({ role: ModeratorRole.moderator }));

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("error");
    expect(auditLogEntryFindUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects an entry that has already been reverted", async () => {
    const entry = baseEntry({ revertedAt: new Date() });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("error");
    expect(cameraUpdateMock).not.toHaveBeenCalled();
    expect(auditLogEntryCreateMock).not.toHaveBeenCalled();
  });

  it("rejects when a newer entry exists on the same entity", async () => {
    const entry = baseEntry();
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(baseEntry({ id: "entry-2" }));

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("error");
    expect(cameraUpdateMock).not.toHaveBeenCalled();
  });

  it("reverts a camera_verify decision, restoring the exact prior fields and appending a new history event", async () => {
    const entry = baseEntry();
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(cameraUpdateMock).toHaveBeenCalledWith({
      where: { id: "cam-1" },
      data: { moderationState: "pending", status: "unconfirmed" },
    });
    expect(historyEventCreateMock).toHaveBeenCalledTimes(1);
    expect(auditLogEntryUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "entry-1", revertedAt: null },
      data: expect.objectContaining({ revertedByUserId: "admin-user-1" }),
    });
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        revertsEntryId: "entry-1",
        before: { moderationState: "verified", status: "active" },
        after: { moderationState: "pending", status: "unconfirmed" },
      }),
    });
  });

  it("reverts a camera_correction_approve decision, restores camera fields, and resets the correction to pending", async () => {
    const entry = baseEntry({
      action: "camera_correction_approve",
      entityId: "cam-1",
      before: { operator: "WA Police" },
      after: { operator: "NSW Police", correctionReportId: "correction-1", createdSensitiveSiteMatchIds: ["m1"] },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(cameraUpdateMock).toHaveBeenCalledWith({ where: { id: "cam-1" }, data: { operator: "WA Police" } });
    expect(correctionReportUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "correction-1" },
      data: { status: "pending", reviewedAt: null },
    });
  });

  it("reverts a camera_note_add by soft-deleting the note", async () => {
    const entry = baseEntry({
      entityType: "camera_note",
      entityId: "note-1",
      action: "camera_note_add",
      before: null,
      after: { cameraId: "cam-1", authorId: "mod-user-1", body: "Looks fine." },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(cameraNoteUpdateMock).toHaveBeenCalledWith({
      where: { id: "note-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("reverting a moderator_create deactivates the profile rather than deleting it", async () => {
    const entry = baseEntry({
      entityType: "moderator_profile",
      entityId: "profile-2",
      action: "moderator_create",
      before: null,
      after: { role: ModeratorRole.moderator, grants: [] },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(
      adminProfile({ id: "profile-2", role: ModeratorRole.moderator, isActive: true })
    );

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "profile-2" }, data: expect.objectContaining({ isActive: false }) })
    );
  });

  it("reverting a moderator_deactivate (reactivating) never checks the admin count", async () => {
    const entry = baseEntry({
      entityType: "moderator_profile",
      entityId: "profile-2",
      action: "moderator_deactivate",
      before: { isActive: true, deactivatedAt: null },
      after: { isActive: false, deactivatedAt: "2026-09-01T00:00:00.000Z" },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileCountMock).not.toHaveBeenCalled();
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: true, deactivatedAt: null }) })
    );
  });

  it("reverting a moderator_reactivate (deactivating again) checks the admin count and can be blocked", async () => {
    const entry = baseEntry({
      entityType: "moderator_profile",
      entityId: "profile-2",
      action: "moderator_reactivate",
      before: { isActive: false, deactivatedAt: "2026-09-01T00:00:00.000Z" },
      after: { isActive: true, deactivatedAt: null },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(
      adminProfile({ id: "profile-2", role: ModeratorRole.admin, isActive: true })
    );
    moderatorProfileCountMock.mockResolvedValueOnce(0);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("error");
    expect(moderatorProfileUpdateMock).not.toHaveBeenCalled();
  });

  it("reverting a moderator_reactivate succeeds when another active admin remains", async () => {
    const entry = baseEntry({
      entityType: "moderator_profile",
      entityId: "profile-2",
      action: "moderator_reactivate",
      before: { isActive: false, deactivatedAt: "2026-09-01T00:00:00.000Z" },
      after: { isActive: true, deactivatedAt: null },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(
      adminProfile({ id: "profile-2", role: ModeratorRole.admin, isActive: true })
    );
    moderatorProfileCountMock.mockResolvedValueOnce(1);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
  });

  it("reverting a moderator_update restores the exact prior role and grant list", async () => {
    const entry = baseEntry({
      entityType: "moderator_profile",
      entityId: "profile-2",
      action: "moderator_update",
      before: {
        role: ModeratorRole.moderator,
        grants: [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }],
      },
      after: { role: ModeratorRole.admin, grants: [] },
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(entry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(entry);
    // First call: wouldRemoveLastActiveAdmin's own lookup. Second: the "current grants" fetch.
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile({ id: "profile-2", role: ModeratorRole.admin, grants: [] }))
      .mockResolvedValueOnce(adminProfile({ id: "profile-2", role: ModeratorRole.admin, grants: [] }));
    moderatorProfileCountMock.mockResolvedValueOnce(1);

    const result = await revertAuditLogEntry("entry-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith({
      where: { id: "profile-2" },
      data: expect.objectContaining({ role: ModeratorRole.moderator }),
    });
    expect(moderatorGrantCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          state: AuState.wa,
          cameraType: CameraType.speed,
          canView: true,
          canAct: true,
          moderatorProfileId: "profile-2",
        },
      ],
    });
  });

  it("reverting a revert entry restores the original's after values (redo)", async () => {
    const revertEntry = baseEntry({
      id: "revert-entry-1",
      before: { moderationState: "verified", status: "active" },
      after: { moderationState: "pending", status: "unconfirmed" },
      revertsEntryId: "entry-1",
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(revertEntry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(revertEntry);

    const result = await revertAuditLogEntry("revert-entry-1");

    expect(result.status).toBe("ok");
    expect(cameraUpdateMock).toHaveBeenCalledWith({
      where: { id: "cam-1" },
      data: { moderationState: "verified", status: "active" },
    });
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: { moderationState: "pending", status: "unconfirmed" },
        after: { moderationState: "verified", status: "active" },
        revertsEntryId: "revert-entry-1",
      }),
    });
  });

  it("redoing a camera_correction_approve revert restores camera fields without leaking correctionReportId into the update, and re-approves the correction", async () => {
    // The original approve's `after` carries correctionReportId/createdSensitiveSiteMatchIds
    // alongside real camera fields (for audit-log display), but its `before`
    // does not. Reverting that entry produces a revert entry whose `before`
    // is the original `after` verbatim - so redoing (reverting the revert)
    // reads this same asymmetric object back as `before` here, and the id is
    // recovered from there rather than from `after` (which no longer has it).
    const revertEntry = baseEntry({
      id: "revert-entry-1",
      action: "camera_correction_approve",
      entityId: "cam-1",
      before: { operator: "NSW Police", correctionReportId: "correction-1", createdSensitiveSiteMatchIds: ["m1"] },
      after: { operator: "WA Police" },
      revertsEntryId: "entry-1",
    });
    auditLogEntryFindUniqueMock.mockResolvedValueOnce(revertEntry);
    auditLogEntryFindFirstMock.mockResolvedValueOnce(revertEntry);

    const result = await revertAuditLogEntry("revert-entry-1");

    expect(result.status).toBe("ok");
    expect(cameraUpdateMock).toHaveBeenCalledWith({ where: { id: "cam-1" }, data: { operator: "NSW Police" } });
    expect(correctionReportUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "correction-1" },
      data: { status: "approved", reviewedAt: expect.any(Date) },
    });
  });
});
