import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuState, CameraType, ModeratorRole } from "@/generated/prisma/enums";
import { grantFieldName } from "@/lib/moderator-grants";
import type { ModeratorProfileWithGrants } from "@/lib/moderator-access";

const authMock = vi.fn();
const moderatorProfileFindUniqueMock = vi.fn();
const moderatorProfileCreateMock = vi.fn();
const moderatorProfileUpdateMock = vi.fn();
const moderatorProfileCountMock = vi.fn();
const moderatorGrantDeleteManyMock = vi.fn();
const moderatorGrantUpdateMock = vi.fn();
const moderatorGrantCreateManyMock = vi.fn();
const auditLogEntryCreateMock = vi.fn();
const transactionMock = vi.fn((ops: unknown[]) => Promise.all(ops));

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
      create: (...args: unknown[]) => moderatorProfileCreateMock(...args),
      update: (...args: unknown[]) => moderatorProfileUpdateMock(...args),
      count: (...args: unknown[]) => moderatorProfileCountMock(...args),
    },
    moderatorGrant: {
      deleteMany: (...args: unknown[]) => moderatorGrantDeleteManyMock(...args),
      update: (...args: unknown[]) => moderatorGrantUpdateMock(...args),
      createMany: (...args: unknown[]) => moderatorGrantCreateManyMock(...args),
    },
    auditLogEntry: {
      create: (...args: unknown[]) => auditLogEntryCreateMock(...args),
    },
    $transaction: (ops: unknown[]) => transactionMock(ops),
  },
}));

const { createModeratorProfile, updateModeratorPrivileges, deactivateModerator, reactivateModerator } =
  await import("./admin-moderators");

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

beforeEach(() => {
  vi.clearAllMocks();
  transactionMock.mockImplementation((ops: unknown[]) => Promise.all(ops));
  authMock.mockResolvedValue({ user: { id: "admin-user-1" } });
});

describe("createModeratorProfile", () => {
  it("rejects when the signed-in actor is not an admin", async () => {
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(adminProfile({ role: ModeratorRole.moderator }));

    const formData = new FormData();
    formData.set("email", "new@example.com");

    const result = await createModeratorProfile(formData);

    expect(result.status).toBe("error");
    expect(moderatorProfileCreateMock).not.toHaveBeenCalled();
  });

  it("normalizes the submitted email before checking for a duplicate or creating", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("email", "  New@Example.com  ");
    formData.set("role", ModeratorRole.moderator);

    const result = await createModeratorProfile(formData);

    expect(result.status).toBe("ok");
    expect(moderatorProfileFindUniqueMock).toHaveBeenLastCalledWith({ where: { email: "new@example.com" } });
    expect(moderatorProfileCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "new@example.com" }) })
    );
  });

  it("rejects a duplicate email without creating a second profile", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "existing" }));

    const formData = new FormData();
    formData.set("email", "dup@example.com");

    const result = await createModeratorProfile(formData);

    expect(result.status).toBe("error");
    expect(moderatorProfileCreateMock).not.toHaveBeenCalled();
  });

  it("normalizes a canAct-without-canView cell before saving new grants", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("email", "mod@example.com");
    formData.set("role", ModeratorRole.moderator);
    formData.set(grantFieldName(AuState.wa, CameraType.speed, "act"), "on");

    await createModeratorProfile(formData);

    expect(moderatorProfileCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "mod@example.com",
        role: ModeratorRole.moderator,
        lastEditedByUserId: "admin-user-1",
        grants: {
          create: [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }],
        },
      }),
    });
  });

  it("logs a moderator_create audit entry with the granted role and grants", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("email", "mod@example.com");
    formData.set("role", ModeratorRole.moderator);
    formData.set(grantFieldName(AuState.wa, CameraType.speed, "act"), "on");

    await createModeratorProfile(formData);

    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "moderator_profile",
        action: "moderator_create",
        actorId: "admin-user-1",
        after: {
          role: ModeratorRole.moderator,
          grants: [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }],
        },
      }),
    });
  });

  it("ignores the submitted grant grid when the role is admin", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("email", "admin2@example.com");
    formData.set("role", ModeratorRole.admin);
    formData.set(grantFieldName(AuState.wa, CameraType.speed, "act"), "on");

    await createModeratorProfile(formData);

    expect(moderatorProfileCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "admin2@example.com",
        role: ModeratorRole.admin,
        lastEditedByUserId: "admin-user-1",
        grants: { create: [] },
      }),
    });
  });
});

describe("updateModeratorPrivileges", () => {
  it("blocks demoting the last remaining active admin", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", role: ModeratorRole.admin, isActive: true, grants: [] }));
    moderatorProfileCountMock.mockResolvedValueOnce(0);

    const formData = new FormData();
    formData.set("role", ModeratorRole.moderator);

    const result = await updateModeratorPrivileges("target-1", formData);

    expect(result.status).toBe("error");
    expect(moderatorProfileUpdateMock).not.toHaveBeenCalled();
  });

  it("allows demoting an admin when another active admin remains", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", role: ModeratorRole.admin, isActive: true, grants: [] }));
    moderatorProfileCountMock.mockResolvedValueOnce(1);

    const formData = new FormData();
    formData.set("role", ModeratorRole.moderator);

    const result = await updateModeratorPrivileges("target-1", formData);

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith({
      where: { id: "target-1" },
      data: { role: ModeratorRole.moderator, lastEditedByUserId: "admin-user-1" },
    });
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "moderator_profile",
        action: "moderator_update",
        actorId: "admin-user-1",
        before: { role: ModeratorRole.admin, grants: [] },
        after: { role: ModeratorRole.moderator, grants: [] },
      }),
    });
  });

  it("deletes every existing grant when promoting a moderator to admin", async () => {
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(adminProfile()).mockResolvedValueOnce(
      adminProfile({
        id: "target-1",
        role: ModeratorRole.moderator,
        grants: [
          {
            id: "g1",
            moderatorProfileId: "target-1",
            state: AuState.wa,
            cameraType: CameraType.speed,
            canView: true,
            canAct: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })
    );

    const formData = new FormData();
    formData.set("role", ModeratorRole.admin);

    const result = await updateModeratorPrivileges("target-1", formData);

    expect(result.status).toBe("ok");
    expect(moderatorGrantDeleteManyMock).toHaveBeenCalledWith({ where: { id: { in: ["g1"] } } });
    expect(moderatorGrantCreateManyMock).not.toHaveBeenCalled();
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "moderator_update",
        before: {
          role: ModeratorRole.moderator,
          grants: [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }],
        },
        after: { role: ModeratorRole.admin, grants: [] },
      }),
    });
  });

  it("normalizes a canAct-without-canView cell when saving grant changes", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", role: ModeratorRole.moderator, grants: [] }));

    const formData = new FormData();
    formData.set("role", ModeratorRole.moderator);
    formData.set(grantFieldName(AuState.nsw, CameraType.alpr, "act"), "on");

    await updateModeratorPrivileges("target-1", formData);

    expect(moderatorGrantCreateManyMock).toHaveBeenCalledWith({
      data: [{ state: AuState.nsw, cameraType: CameraType.alpr, canView: true, canAct: true, moderatorProfileId: "target-1" }],
    });
  });
});

describe("deactivateModerator", () => {
  it("blocks removing the last remaining active admin", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", role: ModeratorRole.admin, isActive: true }));
    moderatorProfileCountMock.mockResolvedValueOnce(0);

    const result = await deactivateModerator("target-1");

    expect(result.status).toBe("error");
    expect(moderatorProfileUpdateMock).not.toHaveBeenCalled();
  });

  it("allows removing an admin when another active admin remains", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", role: ModeratorRole.admin, isActive: true }));
    moderatorProfileCountMock.mockResolvedValueOnce(1);

    const result = await deactivateModerator("target-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "target-1" }, data: expect.objectContaining({ isActive: false }) })
    );
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "moderator_profile",
        action: "moderator_deactivate",
        before: { isActive: true, deactivatedAt: null },
      }),
    });
  });

  it("allows deactivating a non-admin moderator without checking the admin count", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", role: ModeratorRole.moderator, isActive: true }));

    const result = await deactivateModerator("target-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileCountMock).not.toHaveBeenCalled();
  });

  it("rejects when the signed-in actor is not an admin", async () => {
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(adminProfile({ role: ModeratorRole.moderator }));

    const result = await deactivateModerator("target-1");

    expect(result.status).toBe("error");
    expect(moderatorProfileUpdateMock).not.toHaveBeenCalled();
  });
});

describe("reactivateModerator", () => {
  it("rejects when the signed-in actor is not an admin", async () => {
    moderatorProfileFindUniqueMock.mockResolvedValueOnce(adminProfile({ role: ModeratorRole.moderator }));

    const result = await reactivateModerator("target-1");

    expect(result.status).toBe("error");
    expect(moderatorProfileUpdateMock).not.toHaveBeenCalled();
  });

  it("is a no-op that never checks the admin count when the profile is already active", async () => {
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", isActive: true, deactivatedAt: null }));

    const result = await reactivateModerator("target-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).not.toHaveBeenCalled();
    expect(auditLogEntryCreateMock).not.toHaveBeenCalled();
  });

  it("reactivates a deactivated profile and logs the prior deactivation timestamp", async () => {
    const deactivatedAt = new Date("2026-09-01T00:00:00.000Z");
    moderatorProfileFindUniqueMock
      .mockResolvedValueOnce(adminProfile())
      .mockResolvedValueOnce(adminProfile({ id: "target-1", isActive: false, deactivatedAt }));

    const result = await reactivateModerator("target-1");

    expect(result.status).toBe("ok");
    expect(moderatorProfileUpdateMock).toHaveBeenCalledWith({
      where: { id: "target-1" },
      data: { isActive: true, deactivatedAt: null, lastEditedByUserId: "admin-user-1" },
    });
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "moderator_profile",
        action: "moderator_reactivate",
        before: { isActive: false, deactivatedAt: deactivatedAt.toISOString() },
        after: { isActive: true, deactivatedAt: null },
      }),
    });
  });
});
