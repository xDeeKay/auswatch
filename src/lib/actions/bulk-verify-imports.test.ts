import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CameraStatus,
  ExternalImportSource,
  ModerationActionType,
  ModerationReasonCode,
  ModerationState,
  ModeratorRole,
  SensitiveSiteMatchSource,
  SensitiveZoneCategory,
} from "@/generated/prisma/enums";

const authMock = vi.fn();
const moderatorProfileFindUniqueMock = vi.fn();
const cameraFindManyMock = vi.fn();
const cameraUpdateManyMock = vi.fn();
const historyEventCreateMock = vi.fn();
const moderationActionCreateMock = vi.fn();
const auditLogEntryCreateMock = vi.fn();
const matchCreateManyMock = vi.fn();
const checkSensitiveSiteMock = vi.fn();

const txClient = {
  camera: { updateMany: (...args: unknown[]) => cameraUpdateManyMock(...args) },
  historyEvent: { create: (...args: unknown[]) => historyEventCreateMock(...args) },
  moderationAction: { create: (...args: unknown[]) => moderationActionCreateMock(...args) },
  auditLogEntry: { create: (...args: unknown[]) => auditLogEntryCreateMock(...args) },
};

vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/sensitive-site-check", () => ({
  checkSensitiveSite: (...args: unknown[]) => checkSensitiveSiteMock(...args),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    moderatorProfile: { findUnique: (...args: unknown[]) => moderatorProfileFindUniqueMock(...args) },
    camera: { findMany: (...args: unknown[]) => cameraFindManyMock(...args) },
    sensitiveSiteMatch: { createMany: (...args: unknown[]) => matchCreateManyMock(...args) },
    $transaction: (fn: (tx: typeof txClient) => unknown) => fn(txClient),
  },
}));

const { bulkVerifyCleanImports } = await import("./bulk-verify-imports");

const candidate = { id: "cam-1", lat: -35.3, lng: 149.1, status: CameraStatus.active };

const adminProfile = {
  id: "profile-1",
  userId: "user-1",
  role: ModeratorRole.admin,
  isActive: true,
  grants: [],
};

const cleanCheck = { matches: [], checkErrors: [] };

describe("bulkVerifyCleanImports", () => {
  beforeEach(() => {
    authMock.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    moderatorProfileFindUniqueMock.mockReset().mockResolvedValue(adminProfile);
    cameraFindManyMock.mockReset().mockResolvedValue([candidate]);
    cameraUpdateManyMock.mockReset().mockResolvedValue({ count: 1 });
    historyEventCreateMock.mockReset().mockResolvedValue({});
    moderationActionCreateMock.mockReset().mockResolvedValue({});
    auditLogEntryCreateMock.mockReset().mockResolvedValue({});
    matchCreateManyMock.mockReset().mockResolvedValue({});
    checkSensitiveSiteMock.mockReset().mockResolvedValue(cleanCheck);
  });

  it("verifies a clean record with the official dataset reason and a per-camera audit entry", async () => {
    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result).toEqual({ status: "ok", verified: 1, flagged: 0, unchecked: 0, skipped: 0 });
    expect(cameraUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { moderationState: ModerationState.verified, status: CameraStatus.active },
      })
    );
    expect(moderationActionCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cameraId: "cam-1",
        actorId: "user-1",
        action: ModerationActionType.verify,
        reasonCode: ModerationReasonCode.official_dataset,
      }),
    });
    expect(auditLogEntryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ entityId: "cam-1", action: "camera_verify", actorId: "user-1" }),
    });
    expect(historyEventCreateMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a decommissioned record removed and adds no history event", async () => {
    cameraFindManyMock.mockResolvedValue([{ ...candidate, status: CameraStatus.inactive }]);

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result).toEqual({ status: "ok", verified: 1, flagged: 0, unchecked: 0, skipped: 0 });
    expect(cameraUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { moderationState: ModerationState.verified, status: CameraStatus.inactive },
      })
    );
    expect(historyEventCreateMock).not.toHaveBeenCalled();
    expect(auditLogEntryCreateMock).toHaveBeenCalledTimes(1);
  });

  it("only selects pending, match-free records from the requested source", async () => {
    await bulkVerifyCleanImports(ExternalImportSource.vic_open_data);

    expect(cameraFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          externalSource: ExternalImportSource.vic_open_data,
          moderationState: ModerationState.pending,
          sensitiveSiteMatches: { none: {} },
        },
      })
    );
  });

  it("re-guards the write so a record that changed since selection is not verified", async () => {
    cameraUpdateManyMock.mockResolvedValue({ count: 0 });

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result).toEqual({ status: "ok", verified: 0, flagged: 0, unchecked: 0, skipped: 1 });
    expect(moderationActionCreateMock).not.toHaveBeenCalled();
    expect(auditLogEntryCreateMock).not.toHaveBeenCalled();
    expect(historyEventCreateMock).not.toHaveBeenCalled();
  });

  it("holds back a record that now matches a sensitive site and records the match", async () => {
    checkSensitiveSiteMock.mockResolvedValue({
      matches: [
        {
          source: SensitiveSiteMatchSource.manual_zone,
          category: SensitiveZoneCategory.school,
          distanceMeters: 40,
          lat: -35.3,
          lng: 149.1,
          zoneId: "zone-1",
          detail: "",
        },
      ],
      checkErrors: [],
    });

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result).toEqual({ status: "ok", verified: 0, flagged: 1, unchecked: 0, skipped: 0 });
    expect(cameraUpdateManyMock).not.toHaveBeenCalled();
    expect(matchCreateManyMock).toHaveBeenCalledWith({
      data: [expect.objectContaining({ cameraId: "cam-1", zoneId: "zone-1" })],
    });
  });

  it("fails closed when the sensitive-site check reports an error", async () => {
    checkSensitiveSiteMock.mockResolvedValue({
      matches: [],
      checkErrors: [{ source: SensitiveSiteMatchSource.check_error, message: "cache stale" }],
    });

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result).toEqual({ status: "ok", verified: 0, flagged: 0, unchecked: 1, skipped: 0 });
    expect(cameraUpdateManyMock).not.toHaveBeenCalled();
    expect(matchCreateManyMock).not.toHaveBeenCalled();
  });

  it("fails closed when the sensitive-site check throws", async () => {
    checkSensitiveSiteMock.mockRejectedValue(new Error("db down"));

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result).toEqual({ status: "ok", verified: 0, flagged: 0, unchecked: 1, skipped: 0 });
    expect(cameraUpdateManyMock).not.toHaveBeenCalled();
  });

  it("refuses a moderator who is not an admin", async () => {
    moderatorProfileFindUniqueMock.mockResolvedValue({ ...adminProfile, role: ModeratorRole.moderator });

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result.status).toBe("error");
    expect(cameraFindManyMock).not.toHaveBeenCalled();
    expect(cameraUpdateManyMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);

    const result = await bulkVerifyCleanImports(ExternalImportSource.act_open_data);

    expect(result.status).toBe("error");
    expect(cameraFindManyMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown source before touching the database", async () => {
    const result = await bulkVerifyCleanImports("not_a_source");

    expect(result).toEqual({ status: "error", message: "Unknown import source." });
    expect(cameraFindManyMock).not.toHaveBeenCalled();
  });
});
