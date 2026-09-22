import { prisma } from "@/lib/db";
import { ModerationState, CorrectionReportStatus, ModeratorRole } from "@/generated/prisma/enums";
import type { AuState, CameraType } from "@/generated/prisma/enums";
import type {
  CameraModel,
  CorrectionReportModel,
  SensitiveSiteMatchModel,
} from "@/generated/prisma/models";
import { Prisma } from "@/generated/prisma/client";
import { type ModeratorProfileWithGrants } from "@/lib/moderator-access";
import type { PageParams, PaginatedResult } from "@/lib/pagination";

export type TicketKind = "submission" | "correction";

export type TicketSort = "oldest" | "newest";

export type SubmissionTicket = {
  kind: "submission";
  id: string;
  cameraId: string;
  createdAt: Date;
  state: AuState | null;
  cameraType: CameraType;
  camera: CameraModel & { sensitiveSiteMatches: SensitiveSiteMatchModel[] };
};

export type CorrectionTicket = {
  kind: "correction";
  id: string;
  cameraId: string;
  createdAt: Date;
  state: AuState | null;
  cameraType: CameraType;
  camera: CameraModel;
  correction: CorrectionReportModel;
};

export type Ticket = SubmissionTicket | CorrectionTicket;

export type TicketFilters = {
  state?: AuState;
  cameraType?: CameraType;
  kind?: TicketKind;
};

export type TicketRef = { id: string; kind: TicketKind; cameraId: string; createdAt: Date };

/**
 * Mirrors moderator-access.ts's canView: an admin sees everything, a
 * moderator only sees the exact (state, cameraType) pairs they hold an
 * active grant for. A camera with a null state can never match a pair
 * comparison, so it naturally falls out of view for non-admins, the same
 * way findGrant returns undefined for a null-state ticket.
 */
function buildAccessCondition(profile: ModeratorProfileWithGrants, cameraAlias: string): Prisma.Sql {
  if (profile.role === ModeratorRole.admin) return Prisma.sql`TRUE`;

  const grants = profile.grants.filter((g) => g.canView || g.canAct);
  if (grants.length === 0) return Prisma.sql`FALSE`;

  const pairs = grants.map(
    (g) =>
      Prisma.sql`(${Prisma.raw(cameraAlias)}."state" = ${g.state}::"AuState" AND ${Prisma.raw(cameraAlias)}."type" = ${g.cameraType}::"CameraType")`
  );

  return Prisma.sql`(${Prisma.join(pairs, " OR ")})`;
}

function buildCameraFilterCondition(filters: TicketFilters, cameraAlias: string): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (filters.state) {
    conditions.push(Prisma.sql`${Prisma.raw(cameraAlias)}."state" = ${filters.state}::"AuState"`);
  }
  if (filters.cameraType) {
    conditions.push(Prisma.sql`${Prisma.raw(cameraAlias)}."type" = ${filters.cameraType}::"CameraType"`);
  }
  if (conditions.length === 0) return Prisma.sql`TRUE`;
  return Prisma.join(conditions, " AND ");
}

export function buildUnionSql(profile: ModeratorProfileWithGrants, filters: TicketFilters): Prisma.Sql {
  const branches: Prisma.Sql[] = [];

  if (filters.kind !== "correction") {
    branches.push(Prisma.sql`
      SELECT c."id" AS id, 'submission' AS kind, c."id" AS "cameraId", c."createdAt" AS "createdAt"
      FROM "Camera" c
      WHERE c."moderationState" = ${ModerationState.pending}::"ModerationState"
        AND ${buildCameraFilterCondition(filters, "c")}
        AND ${buildAccessCondition(profile, "c")}
    `);
  }

  if (filters.kind !== "submission") {
    branches.push(Prisma.sql`
      SELECT cr."id" AS id, 'correction' AS kind, cr."cameraId" AS "cameraId", cr."createdAt" AS "createdAt"
      FROM "CorrectionReport" cr
      JOIN "Camera" c ON c."id" = cr."cameraId"
      WHERE cr."status" = ${CorrectionReportStatus.pending}::"CorrectionReportStatus"
        AND ${buildCameraFilterCondition(filters, "c")}
        AND ${buildAccessCondition(profile, "c")}
    `);
  }

  return Prisma.join(branches, " UNION ALL ");
}

export async function listTickets(
  profile: ModeratorProfileWithGrants,
  filters: TicketFilters,
  pageParams: PageParams,
  sort: TicketSort = "oldest"
): Promise<PaginatedResult<Ticket>> {
  const unionSql = buildUnionSql(profile, filters);
  const direction = sort === "newest" ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  const countResult = await prisma.$queryRaw<{ count: number }[]>(
    Prisma.sql`SELECT COUNT(*)::int AS count FROM (${unionSql}) AS combined`
  );
  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageParams.pageSize));
  const page = Math.min(Math.max(pageParams.page, 1), totalPages);
  const offset = (page - 1) * pageParams.pageSize;

  const refs = await prisma.$queryRaw<TicketRef[]>(
    Prisma.sql`
      SELECT * FROM (${unionSql}) AS combined
      ORDER BY "createdAt" ${direction}, id ${direction}
      LIMIT ${pageParams.pageSize} OFFSET ${offset}
    `
  );

  const items = await hydrateTickets(refs);

  return { items, page, pageSize: pageParams.pageSize, total, totalPages };
}

export async function hydrateTickets(refs: TicketRef[]): Promise<Ticket[]> {
  const submissionIds = refs.filter((r) => r.kind === "submission").map((r) => r.id);
  const correctionIds = refs.filter((r) => r.kind === "correction").map((r) => r.id);

  const [cameras, corrections] = await Promise.all([
    submissionIds.length > 0
      ? prisma.camera.findMany({ where: { id: { in: submissionIds } }, include: { sensitiveSiteMatches: true } })
      : Promise.resolve([]),
    correctionIds.length > 0
      ? prisma.correctionReport.findMany({ where: { id: { in: correctionIds } }, include: { camera: true } })
      : Promise.resolve([]),
  ]);

  const cameraById = new Map(cameras.map((c) => [c.id, c]));
  const correctionById = new Map(corrections.map((c) => [c.id, c]));

  return refs.flatMap((ref): Ticket[] => {
    if (ref.kind === "submission") {
      const camera = cameraById.get(ref.id);
      if (!camera) return [];
      return [{ kind: "submission", id: camera.id, cameraId: camera.id, createdAt: camera.createdAt, state: camera.state, cameraType: camera.type, camera }];
    }

    const correction = correctionById.get(ref.id);
    if (!correction) return [];
    return [
      {
        kind: "correction",
        id: correction.id,
        cameraId: correction.cameraId,
        createdAt: correction.createdAt,
        state: correction.camera.state,
        cameraType: correction.camera.type,
        camera: correction.camera,
        correction,
      },
    ];
  });
}
