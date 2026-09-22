import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuState, CameraType, ModerationState, ModeratorRole, PhotoModerationStatus } from "@/generated/prisma/enums";

const cameraPhotoFindUniqueMock = vi.fn();
const correctionPhotoFindUniqueMock = vi.fn();
const getPhotoBytesMock = vi.fn();
const requireModeratorMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    cameraPhoto: { findUnique: (...args: unknown[]) => cameraPhotoFindUniqueMock(...args) },
    correctionPhoto: { findUnique: (...args: unknown[]) => correctionPhotoFindUniqueMock(...args) },
  },
}));

vi.mock("@/lib/photo-storage", () => ({
  getPhotoBytes: (...args: unknown[]) => getPhotoBytesMock(...args),
}));

// Not vi.importActual: the real module imports @/auth -> next-auth, which
// doesn't resolve in this test environment (see moderator-access.test.ts's
// own @/auth mock for the same issue). canView's semantics are small enough
// to mirror directly rather than needing the real implementation here.
vi.mock("@/lib/moderator-access", () => ({
  requireModerator: (...args: unknown[]) => requireModeratorMock(...args),
  canView: (
    profile: { role: string; grants: Array<{ state: string; cameraType: string; canView: boolean; canAct: boolean }> },
    ticket: { state: string | null; type: string }
  ) => {
    if (profile.role === "admin") return true;
    if (ticket.state === null) return false;
    const grant = profile.grants.find((g) => g.state === ticket.state && g.cameraType === ticket.type);
    return grant ? grant.canView || grant.canAct : false;
  },
}));

const { GET } = await import("./route");

function moderatorProfile(grants: Array<{ state: AuState; cameraType: CameraType }>) {
  return {
    id: "mod-1",
    role: ModeratorRole.moderator,
    grants: grants.map((g, i) => ({ id: `g${i}`, state: g.state, cameraType: g.cameraType, canView: true, canAct: false })),
  };
}

const adminAccess = { status: "ok" as const, profile: { id: "admin-1", role: ModeratorRole.admin, grants: [] } };
const loggedOutAccess = { status: "unauthenticated" as const };

function req() {
  return new Request("http://localhost/api/photos/photo-1");
}

async function callGet(photoId = "photo-1") {
  return GET(req(), { params: Promise.resolve({ photoId }) });
}

describe("GET /api/photos/[photoId]", () => {
  beforeEach(() => {
    cameraPhotoFindUniqueMock.mockReset().mockResolvedValue(null);
    correctionPhotoFindUniqueMock.mockReset().mockResolvedValue(null);
    getPhotoBytesMock.mockReset().mockResolvedValue({ data: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
    requireModeratorMock.mockReset().mockResolvedValue(loggedOutAccess);
  });

  it("returns 404 for an id that matches neither a CameraPhoto nor a CorrectionPhoto", async () => {
    const res = await callGet();
    expect(res.status).toBe(404);
  });

  describe("CameraPhoto", () => {
    function cameraPhoto(overrides: Record<string, unknown> = {}) {
      return {
        id: "photo-1",
        storageKey: "cameras/cam-1/photo-1.jpg",
        contentType: "image/jpeg",
        moderationStatus: PhotoModerationStatus.pending,
        camera: { state: AuState.wa, type: CameraType.alpr, moderationState: ModerationState.pending },
        ...overrides,
      };
    }

    it("serves an approved photo on a verified camera to a logged-out request", async () => {
      cameraPhotoFindUniqueMock.mockResolvedValue(
        cameraPhoto({
          moderationStatus: PhotoModerationStatus.approved,
          camera: { state: AuState.wa, type: CameraType.alpr, moderationState: ModerationState.verified },
        })
      );

      const res = await callGet();
      expect(res.status).toBe(200);
      expect(requireModeratorMock).not.toHaveBeenCalled();
    });

    it("returns 404, not the photo, for a logged-out request when the photo is still pending", async () => {
      cameraPhotoFindUniqueMock.mockResolvedValue(cameraPhoto({ moderationStatus: PhotoModerationStatus.pending }));

      const res = await callGet();
      expect(res.status).toBe(404);
    });

    it("returns 404 for a logged-out request when the photo is approved but the camera isn't verified yet", async () => {
      cameraPhotoFindUniqueMock.mockResolvedValue(
        cameraPhoto({
          moderationStatus: PhotoModerationStatus.approved,
          camera: { state: AuState.wa, type: CameraType.alpr, moderationState: ModerationState.pending },
        })
      );

      const res = await callGet();
      expect(res.status).toBe(404);
    });

    it("serves a pending photo to a moderator with a matching grant", async () => {
      cameraPhotoFindUniqueMock.mockResolvedValue(cameraPhoto());
      requireModeratorMock.mockResolvedValue({
        status: "ok",
        profile: moderatorProfile([{ state: AuState.wa, cameraType: CameraType.alpr }]),
      });

      const res = await callGet();
      expect(res.status).toBe(200);
    });

    it("returns 404 for a moderator without a grant for that state/type", async () => {
      cameraPhotoFindUniqueMock.mockResolvedValue(cameraPhoto());
      requireModeratorMock.mockResolvedValue({
        status: "ok",
        profile: moderatorProfile([{ state: AuState.nsw, cameraType: CameraType.alpr }]),
      });

      const res = await callGet();
      expect(res.status).toBe(404);
    });

    it("serves a pending photo to an admin regardless of grants", async () => {
      cameraPhotoFindUniqueMock.mockResolvedValue(cameraPhoto());
      requireModeratorMock.mockResolvedValue(adminAccess);

      const res = await callGet();
      expect(res.status).toBe(200);
    });
  });

  describe("CorrectionPhoto", () => {
    function correctionPhoto(overrides: Record<string, unknown> = {}) {
      return {
        id: "cphoto-1",
        storageKey: "corrections/corr-1/cphoto-1.jpg",
        contentType: "image/jpeg",
        correctionReport: { camera: { state: AuState.vic, type: CameraType.cctv } },
        ...overrides,
      };
    }

    it("never serves a correction photo to a logged-out request, even if the camera is verified", async () => {
      correctionPhotoFindUniqueMock.mockResolvedValue(correctionPhoto());

      const res = await callGet();
      expect(res.status).toBe(404);
    });

    it("serves a correction photo to a moderator with a matching grant", async () => {
      correctionPhotoFindUniqueMock.mockResolvedValue(correctionPhoto());
      requireModeratorMock.mockResolvedValue({
        status: "ok",
        profile: moderatorProfile([{ state: AuState.vic, cameraType: CameraType.cctv }]),
      });

      const res = await callGet();
      expect(res.status).toBe(200);
    });
  });
});
