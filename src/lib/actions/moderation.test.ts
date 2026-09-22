import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuState, CameraStatus, CameraType, ModerationState, ModeratorRole, PhotoModerationStatus } from "@/generated/prisma/enums";

const authMock = vi.fn();
const moderatorProfileFindUniqueMock = vi.fn();
const cameraFindUniqueMock = vi.fn();
const cameraUpdateManyMock = vi.fn();
const historyEventCreateMock = vi.fn();
const moderationActionCreateMock = vi.fn();
const auditLogEntryCreateMock = vi.fn();
const cameraPhotoFindManyMock = vi.fn();
const cameraPhotoUpdateMock = vi.fn();

const txClient = {
  camera: {
    findUnique: (...args: unknown[]) => cameraFindUniqueMock(...args),
    updateMany: (...args: unknown[]) => cameraUpdateManyMock(...args),
  },
  historyEvent: { create: (...args: unknown[]) => historyEventCreateMock(...args) },
  moderationAction: { create: (...args: unknown[]) => moderationActionCreateMock(...args) },
  auditLogEntry: { create: (...args: unknown[]) => auditLogEntryCreateMock(...args) },
  cameraPhoto: {
    findMany: (...args: unknown[]) => cameraPhotoFindManyMock(...args),
    update: (...args: unknown[]) => cameraPhotoUpdateMock(...args),
  },
};

vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    moderatorProfile: { findUnique: (...args: unknown[]) => moderatorProfileFindUniqueMock(...args) },
    $transaction: (fn: (tx: typeof txClient) => unknown) => fn(txClient),
  },
}));

const { verifyCamera, removeCamera } = await import("./moderation");

const camera = {
  id: "cam-1",
  state: AuState.wa,
  type: CameraType.alpr,
  moderationState: ModerationState.pending,
  status: CameraStatus.unconfirmed,
};

const moderatorProfile = {
  id: "mod-profile-1",
  userId: "user-1",
  role: ModeratorRole.admin,
  isActive: true,
  grants: [],
};

function verifyFormData(approvedPhotoIds: string[] = []) {
  const fd = new FormData();
  fd.set("reasonCode", "verified_accurate");
  fd.set("note", "");
  for (const id of approvedPhotoIds) fd.append("approvedPhotoIds", id);
  return fd;
}

function removeFormData() {
  const fd = new FormData();
  fd.set("reasonCode", "implausible");
  fd.set("note", "");
  return fd;
}

describe("verifyCamera photo resolution", () => {
  beforeEach(() => {
    authMock.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    moderatorProfileFindUniqueMock.mockReset().mockResolvedValue(moderatorProfile);
    cameraFindUniqueMock.mockReset().mockResolvedValue(camera);
    cameraUpdateManyMock.mockReset().mockResolvedValue({ count: 1 });
    historyEventCreateMock.mockReset().mockResolvedValue({});
    moderationActionCreateMock.mockReset().mockResolvedValue({});
    auditLogEntryCreateMock.mockReset().mockResolvedValue({});
    cameraPhotoFindManyMock.mockReset().mockResolvedValue([]);
    cameraPhotoUpdateMock.mockReset().mockResolvedValue({});
  });

  it("approves only the checked photo ids and rejects the rest", async () => {
    cameraPhotoFindManyMock.mockResolvedValue([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);

    const result = await verifyCamera(camera.id, verifyFormData(["p1", "p3"]));

    expect(result.status).toBe("ok");
    expect(cameraPhotoUpdateMock).toHaveBeenCalledTimes(3);
    expect(cameraPhotoUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { moderationStatus: PhotoModerationStatus.approved },
    });
    expect(cameraPhotoUpdateMock).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: { moderationStatus: PhotoModerationStatus.rejected },
    });
    expect(cameraPhotoUpdateMock).toHaveBeenCalledWith({
      where: { id: "p3" },
      data: { moderationStatus: PhotoModerationStatus.approved },
    });
  });

  it("only resolves photos still pending, never re-deciding an already-reviewed photo", async () => {
    await verifyCamera(camera.id, verifyFormData(["p1"]));

    expect(cameraPhotoFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cameraId: camera.id, moderationStatus: PhotoModerationStatus.pending } })
    );
  });

  it("does nothing when the camera has no pending photos", async () => {
    const result = await verifyCamera(camera.id, verifyFormData());

    expect(result.status).toBe("ok");
    expect(cameraPhotoUpdateMock).not.toHaveBeenCalled();
  });
});

describe("removeCamera photo resolution", () => {
  beforeEach(() => {
    authMock.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    moderatorProfileFindUniqueMock.mockReset().mockResolvedValue(moderatorProfile);
    cameraFindUniqueMock.mockReset().mockResolvedValue(camera);
    cameraUpdateManyMock.mockReset().mockResolvedValue({ count: 1 });
    historyEventCreateMock.mockReset().mockResolvedValue({});
    moderationActionCreateMock.mockReset().mockResolvedValue({});
    auditLogEntryCreateMock.mockReset().mockResolvedValue({});
    cameraPhotoFindManyMock.mockReset().mockResolvedValue([]);
    cameraPhotoUpdateMock.mockReset().mockResolvedValue({});
  });

  it("rejects every pending photo, since a removed camera's photos never go public", async () => {
    cameraPhotoFindManyMock.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);

    const result = await removeCamera(camera.id, removeFormData());

    expect(result.status).toBe("ok");
    expect(cameraPhotoUpdateMock).toHaveBeenCalledTimes(2);
    expect(cameraPhotoUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { moderationStatus: PhotoModerationStatus.rejected },
    });
    expect(cameraPhotoUpdateMock).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: { moderationStatus: PhotoModerationStatus.rejected },
    });
  });
});
