import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuState, CameraType, ModeratorRole } from "@/generated/prisma/enums";
import type { ModeratorProfileWithGrants } from "./moderator-access";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    moderatorProfile: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

const {
  findGrant,
  canView,
  canAct,
  assertCanAct,
  requireModerator,
  requireAdmin,
  getModeratorProfile,
  resolveModeratorSignIn,
  provisionModeratorProfile,
  normalizeModeratorEmail,
  accessDeniedMessage,
} = await import("./moderator-access");

function grant(overrides: Partial<{ state: AuState; cameraType: CameraType; canView: boolean; canAct: boolean }> = {}) {
  return {
    id: "grant-1",
    moderatorProfileId: "profile-1",
    state: AuState.wa,
    cameraType: CameraType.speed,
    canView: true,
    canAct: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function profile(overrides: Partial<ModeratorProfileWithGrants> = {}): ModeratorProfileWithGrants {
  return {
    id: "profile-1",
    email: "mod@example.com",
    userId: "user-1",
    role: ModeratorRole.moderator,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deactivatedAt: null,
    lastEditedByUserId: null,
    grants: [],
    ...overrides,
  };
}

describe("findGrant / canView / canAct (pure scope logic)", () => {
  it("has no access at all with zero grant rows (default-deny)", () => {
    const p = profile({ grants: [] });
    const ticket = { state: AuState.wa, type: CameraType.speed };
    expect(canView(p, ticket)).toBe(false);
    expect(canAct(p, ticket)).toBe(false);
  });

  it("a view-only grant permits viewing but not acting", () => {
    const p = profile({ grants: [grant({ canView: true, canAct: false })] });
    const ticket = { state: AuState.wa, type: CameraType.speed };
    expect(canView(p, ticket)).toBe(true);
    expect(canAct(p, ticket)).toBe(false);
  });

  it("canAct: true implies viewing even if canView were somehow false on the row", () => {
    const p = profile({ grants: [grant({ canView: false, canAct: true })] });
    const ticket = { state: AuState.wa, type: CameraType.speed };
    expect(canView(p, ticket)).toBe(true);
    expect(canAct(p, ticket)).toBe(true);
  });

  it("does not cross-multiply: a grant for one state+type does not cover a different state", () => {
    const p = profile({ grants: [grant({ state: AuState.wa, cameraType: CameraType.speed, canAct: true })] });
    expect(canView(p, { state: AuState.nsw, type: CameraType.speed })).toBe(false);
    expect(canAct(p, { state: AuState.nsw, type: CameraType.speed })).toBe(false);
  });

  it("does not cross-multiply: a grant for one state+type does not cover a different type", () => {
    const p = profile({ grants: [grant({ state: AuState.wa, cameraType: CameraType.speed, canAct: true })] });
    expect(canView(p, { state: AuState.wa, type: CameraType.alpr })).toBe(false);
    expect(canAct(p, { state: AuState.wa, type: CameraType.alpr })).toBe(false);
  });

  it("two separate grants each apply only to their own combination", () => {
    const p = profile({
      grants: [
        grant({ state: AuState.wa, cameraType: CameraType.speed, canAct: true }),
        grant({ state: AuState.nsw, cameraType: CameraType.alpr, canView: true, canAct: false }),
      ],
    });
    expect(canAct(p, { state: AuState.wa, type: CameraType.speed })).toBe(true);
    expect(canAct(p, { state: AuState.nsw, type: CameraType.alpr })).toBe(false);
    expect(canView(p, { state: AuState.nsw, type: CameraType.alpr })).toBe(true);
    expect(canView(p, { state: AuState.wa, type: CameraType.alpr })).toBe(false);
    expect(canView(p, { state: AuState.nsw, type: CameraType.speed })).toBe(false);
  });

  it("admin bypasses every check with zero grant rows", () => {
    const p = profile({ role: ModeratorRole.admin, grants: [] });
    const ticket = { state: AuState.nt, type: CameraType.facial };
    expect(canView(p, ticket)).toBe(true);
    expect(canAct(p, ticket)).toBe(true);
  });

  it("fails closed for an unresolved (null) state, even for a moderator with matching grants elsewhere", () => {
    const p = profile({ grants: [grant({ state: AuState.wa, cameraType: CameraType.speed, canAct: true })] });
    const ticket = { state: null, type: CameraType.speed };
    expect(canView(p, ticket)).toBe(false);
    expect(canAct(p, ticket)).toBe(false);
  });

  it("admin still has access when state is null (unresolved cameras are admin-only for non-admins)", () => {
    const p = profile({ role: ModeratorRole.admin, grants: [] });
    expect(canView(p, { state: null, type: CameraType.speed })).toBe(true);
  });

  it("assertCanAct returns ok:false with a message when the actor lacks act privilege", () => {
    const p = profile({ grants: [] });
    const result = assertCanAct(p, { state: AuState.wa, type: CameraType.speed });
    expect(result.ok).toBe(false);
  });

  it("assertCanAct returns ok:true when the actor has act privilege", () => {
    const p = profile({ grants: [grant({ canAct: true })] });
    const result = assertCanAct(p, { state: AuState.wa, type: CameraType.speed });
    expect(result.ok).toBe(true);
  });

  it("findGrant returns undefined, not a throw, for an unresolved state", () => {
    const p = profile({ grants: [grant()] });
    expect(findGrant(p, { state: null, type: CameraType.speed })).toBeUndefined();
  });
});

describe("accessDeniedMessage", () => {
  it("distinguishes unauthenticated from a forbidden (e.g. deactivated) account", () => {
    expect(accessDeniedMessage({ status: "unauthenticated" })).toBe("Not authenticated.");
    expect(accessDeniedMessage({ status: "forbidden" })).not.toBe("Not authenticated.");
  });
});

describe("normalizeModeratorEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeModeratorEmail("  Alice@Example.com ")).toBe("alice@example.com");
  });
});

describe("requireModerator / requireAdmin / getModeratorProfile", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
  });

  it("returns unauthenticated when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireModerator();
    expect(result.status).toBe("unauthenticated");
  });

  it("returns forbidden when signed in but no ModeratorProfile exists", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findUniqueMock.mockResolvedValue(null);
    const result = await requireModerator();
    expect(result.status).toBe("forbidden");
  });

  it("returns forbidden for a deactivated profile even with a valid session", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findUniqueMock.mockResolvedValue(profile({ isActive: false }));
    const result = await requireModerator();
    expect(result.status).toBe("forbidden");
  });

  it("returns ok with the profile for an active moderator", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findUniqueMock.mockResolvedValue(profile());
    const result = await requireModerator();
    expect(result).toEqual({ status: "ok", profile: profile() });
  });

  it("requireAdmin returns forbidden for an active non-admin moderator", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findUniqueMock.mockResolvedValue(profile({ role: ModeratorRole.moderator }));
    const result = await requireAdmin();
    expect(result.status).toBe("forbidden");
  });

  it("requireAdmin returns ok for an active admin", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findUniqueMock.mockResolvedValue(profile({ role: ModeratorRole.admin }));
    const result = await requireAdmin();
    expect(result.status).toBe("ok");
  });

  it("getModeratorProfile returns null instead of throwing when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect(await getModeratorProfile()).toBeNull();
  });
});

describe("resolveModeratorSignIn", () => {
  const ORIGINAL_ENV = process.env.BOOTSTRAP_ADMIN_EMAILS;

  beforeEach(() => {
    findUniqueMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
  });

  afterEach(() => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = ORIGINAL_ENV;
  });

  it("denies a null/empty email outright", async () => {
    expect(await resolveModeratorSignIn(null, "user-1")).toBe(false);
    expect(await resolveModeratorSignIn("", "user-1")).toBe(false);
  });

  it("allows first sign-in when bootstrap-listed and no profile exists, without writing anything yet", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = "admin@example.com";
    findUniqueMock.mockResolvedValue(null);

    const allowed = await resolveModeratorSignIn("Admin@Example.com", "user-1");

    expect(allowed).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("denies sign-in when no profile exists and the email is not bootstrap-listed", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = "someone-else@example.com";
    findUniqueMock.mockResolvedValue(null);

    expect(await resolveModeratorSignIn("nobody@example.com", "user-1")).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("denies sign-in for a deactivated profile", async () => {
    findUniqueMock.mockResolvedValue(profile({ isActive: false }));
    expect(await resolveModeratorSignIn("mod@example.com", "user-1")).toBe(false);
  });

  it("allows sign-in for a pre-provisioned profile with no linked user yet, without writing anything yet", async () => {
    findUniqueMock.mockResolvedValue(profile({ userId: null }));

    const allowed = await resolveModeratorSignIn("mod@example.com", "user-1");

    expect(allowed).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows sign-in when userId already matches, without writing anything", async () => {
    findUniqueMock.mockResolvedValue(profile({ userId: "user-1" }));

    const allowed = await resolveModeratorSignIn("mod@example.com", "user-1");

    expect(allowed).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("denies sign-in when the profile is linked to a different userId", async () => {
    findUniqueMock.mockResolvedValue(profile({ userId: "some-other-user" }));

    const allowed = await resolveModeratorSignIn("mod@example.com", "user-1");

    expect(allowed).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("provisionModeratorProfile", () => {
  const ORIGINAL_ENV = process.env.BOOTSTRAP_ADMIN_EMAILS;

  beforeEach(() => {
    findUniqueMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
  });

  afterEach(() => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = ORIGINAL_ENV;
  });

  it("does nothing for a null/empty email", async () => {
    await provisionModeratorProfile(null, "user-1");
    await provisionModeratorProfile("", "user-1");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("creates an unrestricted admin profile once bootstrap-listed and no profile exists", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = "admin@example.com";
    findUniqueMock.mockResolvedValue(null);

    await provisionModeratorProfile("Admin@Example.com", "user-1");

    expect(createMock).toHaveBeenCalledWith({
      data: { email: "admin@example.com", userId: "user-1", role: ModeratorRole.admin, isActive: true },
    });
  });

  it("does not create a profile when the email is not bootstrap-listed", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = "someone-else@example.com";
    findUniqueMock.mockResolvedValue(null);

    await provisionModeratorProfile("nobody@example.com", "user-1");

    expect(createMock).not.toHaveBeenCalled();
  });

  it("links userId for a pre-provisioned profile with no linked user yet", async () => {
    findUniqueMock.mockResolvedValue(profile({ userId: null }));

    await provisionModeratorProfile("mod@example.com", "user-1");

    expect(updateMock).toHaveBeenCalledWith({ where: { id: "profile-1" }, data: { userId: "user-1" } });
  });

  it("does not write anything when userId already matches", async () => {
    findUniqueMock.mockResolvedValue(profile({ userId: "user-1" }));

    await provisionModeratorProfile("mod@example.com", "user-1");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not write anything when the profile is linked to a different userId", async () => {
    findUniqueMock.mockResolvedValue(profile({ userId: "some-other-user" }));

    await provisionModeratorProfile("mod@example.com", "user-1");

    expect(updateMock).not.toHaveBeenCalled();
  });
});
