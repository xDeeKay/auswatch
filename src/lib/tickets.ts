import { prisma } from "@/lib/db";
import { ModerationState, CorrectionReportStatus } from "@/generated/prisma/enums";
import type { AuState, CameraType } from "@/generated/prisma/enums";
import type {
  CameraModel,
  CorrectionReportModel,
  SensitiveSiteMatchModel,
} from "@/generated/prisma/models";
import type { Prisma } from "@/generated/prisma/client";
import { canView, type ModeratorProfileWithGrants } from "@/lib/moderator-access";
import { paginate, type PageParams, type PaginatedResult } from "@/lib/pagination";

export type TicketKind = "submission" | "correction";

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

const MAX_TICKETS_PER_SOURCE = 500;

export function mergeTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const byDate = a.createdAt.getTime() - b.createdAt.getTime();
    if (byDate !== 0) return byDate;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export async function listTickets(
  profile: ModeratorProfileWithGrants,
  filters: TicketFilters,
  pageParams: PageParams
): Promise<PaginatedResult<Ticket>> {
  const cameraWhere: Prisma.CameraWhereInput = {};
  if (filters.state) cameraWhere.state = filters.state;
  if (filters.cameraType) cameraWhere.type = filters.cameraType;

  const [pendingCameras, pendingCorrections] = await Promise.all([
    filters.kind === "correction"
      ? []
      : prisma.camera.findMany({
          where: { moderationState: ModerationState.pending, ...cameraWhere },
          include: { sensitiveSiteMatches: true },
          orderBy: { createdAt: "asc" },
          take: MAX_TICKETS_PER_SOURCE,
        }),
    filters.kind === "submission"
      ? []
      : prisma.correctionReport.findMany({
          where: { status: CorrectionReportStatus.pending, camera: cameraWhere },
          include: { camera: true },
          orderBy: { createdAt: "asc" },
          take: MAX_TICKETS_PER_SOURCE,
        }),
  ]);

  const submissionTickets: Ticket[] = pendingCameras.map((camera) => ({
    kind: "submission",
    id: camera.id,
    cameraId: camera.id,
    createdAt: camera.createdAt,
    state: camera.state,
    cameraType: camera.type,
    camera,
  }));

  const correctionTickets: Ticket[] = pendingCorrections.map((correction) => ({
    kind: "correction",
    id: correction.id,
    cameraId: correction.cameraId,
    createdAt: correction.createdAt,
    state: correction.camera.state,
    cameraType: correction.camera.type,
    camera: correction.camera,
    correction,
  }));

  const viewable = [...submissionTickets, ...correctionTickets].filter((ticket) =>
    canView(profile, { state: ticket.state, type: ticket.cameraType })
  );

  return paginate(mergeTickets(viewable), pageParams);
}
