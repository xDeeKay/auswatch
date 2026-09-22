import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuState, CameraType, ModeratorRole } from "@/generated/prisma/enums";
import type { ModeratorProfileWithGrants } from "@/lib/moderator-access";
import type { CameraModel, CorrectionReportModel } from "@/generated/prisma/models";
import type { Prisma } from "@/generated/prisma/client";

const queryRawMock = vi.fn();
const cameraFindManyMock = vi.fn();
const correctionFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    camera: { findMany: (...args: unknown[]) => cameraFindManyMock(...args) },
    correctionReport: { findMany: (...args: unknown[]) => correctionFindManyMock(...args) },
  },
}));

const { buildUnionSql, hydrateTickets, listTickets } = await import("./tickets");

function moderator(grants: Array<{ state: AuState; cameraType: CameraType; canView: boolean; canAct: boolean }>): ModeratorProfileWithGrants {
  return {
    id: "mod-1",
    email: "mod@example.com",
    userId: "user-1",
    role: ModeratorRole.moderator,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deactivatedAt: null,
    lastEditedByUserId: null,
    grants: grants.map((g, i) => ({
      id: `grant-${i}`,
      moderatorProfileId: "mod-1",
      state: g.state,
      cameraType: g.cameraType,
      canView: g.canView,
      canAct: g.canAct,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
}

function admin(): ModeratorProfileWithGrants {
  return { ...moderator([]), role: ModeratorRole.admin };
}

describe("buildUnionSql", () => {
  it("uses an unconditional TRUE access check for an admin, regardless of grants", () => {
    const frag = buildUnionSql(admin(), {});
    expect(frag.sql).toContain("TRUE");
    expect(frag.sql).not.toContain("FALSE");
  });

  it("denies everything for a moderator with no grants at all", () => {
    const frag = buildUnionSql(moderator([]), {});
    expect(frag.sql).toContain("FALSE");
  });

  it("scopes a moderator to exactly their granted (state, cameraType) pairs", () => {
    const frag = buildUnionSql(
      moderator([{ state: AuState.wa, cameraType: CameraType.alpr, canView: true, canAct: false }]),
      {}
    );
    expect(frag.values).toContain(AuState.wa);
    expect(frag.values).toContain(CameraType.alpr);
  });

  it("grants view access from canAct alone, even when canView is false", () => {
    const frag = buildUnionSql(
      moderator([{ state: AuState.nsw, cameraType: CameraType.speed, canView: false, canAct: true }]),
      {}
    );
    expect(frag.values).toContain(AuState.nsw);
  });

  it("includes both submission and correction branches by default", () => {
    const frag = buildUnionSql(admin(), {});
    expect(frag.sql).toContain("UNION ALL");
    expect(frag.sql).toContain('"Camera"');
    expect(frag.sql).toContain('"CorrectionReport"');
  });

  it("omits the correction branch when filtering to submissions only", () => {
    const frag = buildUnionSql(admin(), { kind: "submission" });
    expect(frag.sql).not.toContain("UNION ALL");
    expect(frag.sql).not.toContain('"CorrectionReport"');
  });

  it("omits the submission branch when filtering to corrections only", () => {
    const frag = buildUnionSql(admin(), { kind: "correction" });
    expect(frag.sql).not.toContain("UNION ALL");
    expect(frag.sql).toContain('"CorrectionReport"');
  });

  it("binds the state and camera type filters as query values", () => {
    const frag = buildUnionSql(admin(), { state: AuState.qld, cameraType: CameraType.facial });
    expect(frag.values).toContain(AuState.qld);
    expect(frag.values).toContain(CameraType.facial);
  });
});

describe("hydrateTickets", () => {
  beforeEach(() => {
    cameraFindManyMock.mockReset();
    correctionFindManyMock.mockReset();
  });

  it("preserves the ref order across a mix of submission and correction tickets", async () => {
    const cameraA = { id: "cam-a", type: CameraType.speed, state: AuState.wa } as CameraModel & {
      sensitiveSiteMatches: [];
    };
    const cameraB = { id: "cam-b", type: CameraType.alpr, state: AuState.nsw } as CameraModel;
    const correction = { id: "corr-1", cameraId: "cam-b", createdAt: new Date() } as CorrectionReportModel;

    cameraFindManyMock.mockResolvedValue([cameraA]);
    correctionFindManyMock.mockResolvedValue([{ ...correction, camera: cameraB }]);

    const refs = [
      { id: "cam-a", kind: "submission" as const, cameraId: "cam-a", createdAt: new Date(1) },
      { id: "corr-1", kind: "correction" as const, cameraId: "cam-b", createdAt: new Date(2) },
    ];

    const items = await hydrateTickets(refs);

    expect(items.map((t) => t.id)).toEqual(["cam-a", "corr-1"]);
    expect(items[0]?.kind).toBe("submission");
    expect(items[1]?.kind).toBe("correction");
  });

  it("silently drops a ref whose row no longer exists rather than throwing", async () => {
    cameraFindManyMock.mockResolvedValue([]);
    correctionFindManyMock.mockResolvedValue([]);

    const refs = [{ id: "cam-gone", kind: "submission" as const, cameraId: "cam-gone", createdAt: new Date() }];
    const items = await hydrateTickets(refs);

    expect(items).toEqual([]);
  });

  it("skips both hydration queries entirely for an empty ref list", async () => {
    await hydrateTickets([]);
    expect(cameraFindManyMock).not.toHaveBeenCalled();
    expect(correctionFindManyMock).not.toHaveBeenCalled();
  });
});

describe("listTickets", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    cameraFindManyMock.mockReset();
    correctionFindManyMock.mockReset();
  });

  it("computes total and totalPages from the count query, independent of the page-size window", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1253 }]).mockResolvedValueOnce([]);

    const result = await listTickets(admin(), {}, { page: 1, pageSize: 20 });

    expect(result.total).toBe(1253);
    expect(result.totalPages).toBe(63);
  });

  it("clamps a requested page beyond the last page down to the last page", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 45 }]).mockResolvedValueOnce([]);

    const result = await listTickets(admin(), {}, { page: 999, pageSize: 20 });

    expect(result.page).toBe(3);
  });

  it("returns an empty page with totalPages 1 rather than crashing when nothing is pending", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

    const result = await listTickets(admin(), {}, { page: 1, pageSize: 20 });

    expect(result).toMatchObject({ items: [], total: 0, totalPages: 1, page: 1 });
  });

  it("orders oldest first by default", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

    await listTickets(admin(), {}, { page: 1, pageSize: 20 });

    const refsQuery = queryRawMock.mock.calls[1]![0] as Prisma.Sql;
    expect(refsQuery.sql).toContain("ASC");
    expect(refsQuery.sql).not.toContain("DESC");
  });

  it("orders newest first when sort is 'newest'", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

    await listTickets(admin(), {}, { page: 1, pageSize: 20 }, "newest");

    const refsQuery = queryRawMock.mock.calls[1]![0] as Prisma.Sql;
    expect(refsQuery.sql).toContain("DESC");
    expect(refsQuery.sql).not.toContain("ASC");
  });
});
