import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { AuState, CameraStatus, CameraType, ModerationState, ModeratorRole } from "@/generated/prisma/enums";
import { TYPE_LABEL, TYPE_ORDER, STATUS_LABEL, OPERATOR_CATEGORY_LABEL } from "@/lib/camera-labels";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { MODERATION_STATE_LABEL } from "@/lib/moderation-labels";
import { requireModerator } from "@/lib/moderator-access";
import type { TicketSort } from "@/lib/tickets";
import { parsePageParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AusWatch - Cameras",
};

const PAGE_SIZE_OPTIONS = { defaultPageSize: 20, maxPageSize: 100 };
const STATUS_FILTER_OPTIONS: CameraStatus[] = [CameraStatus.active, CameraStatus.removed];

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function isTicketSort(value: string | undefined): value is TicketSort {
  return value === "oldest" || value === "newest";
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return new URLSearchParams(entries).toString();
}

/** Mirrors listTickets' access scoping: an admin sees everything, a moderator only their granted (state, cameraType) pairs. */
function buildAccessWhere(profile: {
  role: ModeratorRole;
  grants: { state: AuState; cameraType: CameraType; canView: boolean; canAct: boolean }[];
}): Prisma.CameraWhereInput {
  if (profile.role === ModeratorRole.admin) return {};

  const grants = profile.grants.filter((g) => g.canView || g.canAct);
  if (grants.length === 0) return { id: { in: [] } };

  return { OR: grants.map((g) => ({ state: g.state, type: g.cameraType })) };
}

export default async function ModerateCamerasPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; type?: string; status?: string; sort?: string; page?: string }>;
}) {
  const access = await requireModerator();
  if (access.status !== "ok") return null;
  const { profile } = access;

  const params = await searchParams;
  const sort: TicketSort = isTicketSort(params.sort) ? params.sort : "newest";

  const isAdmin = profile.role === ModeratorRole.admin;
  const availableStates = (
    isAdmin ? Object.values(AuState) : Array.from(new Set(profile.grants.map((g) => g.state)))
  ).sort((a, b) => STATE_LABEL[a].localeCompare(STATE_LABEL[b]));
  const availableCameraTypes = isAdmin
    ? TYPE_ORDER
    : TYPE_ORDER.filter((t) => profile.grants.some((g) => g.cameraType === t));

  const stateFilter =
    params.state && (Object.values(AuState) as string[]).includes(params.state) ? (params.state as AuState) : undefined;
  const typeFilter =
    params.type && (Object.values(CameraType) as string[]).includes(params.type) ? (params.type as CameraType) : undefined;
  const statusFilter =
    params.status && STATUS_FILTER_OPTIONS.includes(params.status as CameraStatus)
      ? (params.status as CameraStatus)
      : undefined;

  const where: Prisma.CameraWhereInput = {
    AND: [
      { moderationState: { in: [ModerationState.verified, ModerationState.disputed] } },
      buildAccessWhere(profile),
      stateFilter ? { state: stateFilter } : {},
      typeFilter ? { type: typeFilter } : {},
      statusFilter ? { status: statusFilter } : {},
    ],
  };

  const pageParams = parsePageParams({ page: params.page }, PAGE_SIZE_OPTIONS);
  const total = await prisma.camera.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageParams.pageSize));
  const page = Math.min(Math.max(pageParams.page, 1), totalPages);

  const cameras = await prisma.camera.findMany({
    where,
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
    skip: (page - 1) * pageParams.pageSize,
    take: pageParams.pageSize,
  });

  const rangeStart = total === 0 ? 0 : (page - 1) * pageParams.pageSize + 1;
  const rangeEnd = Math.min(page * pageParams.pageSize, total);

  return (
    <>
      <PageHeader
        title="Cameras"
        description={
          <>
            {total} camera{total === 1 ? "" : "s"}
            {total > 0 && ` (showing ${rangeStart}-${rangeEnd})`}
          </>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label>STATUS</Label>
          <Select name="status" defaultValue={params.status ?? ""} className="w-auto">
            <option value="">All statuses</option>
            {STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>CAMERA TYPE</Label>
          <Select name="type" defaultValue={params.type ?? ""} className="w-auto">
            <option value="">All types</option>
            {availableCameraTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>STATE/TERRITORY</Label>
          <Select name="state" defaultValue={params.state ?? ""} className="w-auto">
            <option value="">All states</option>
            {availableStates.map((state) => (
              <option key={state} value={state}>
                {STATE_LABEL[state]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>SORT</Label>
          <Select name="sort" defaultValue={sort} className="w-auto">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="flex flex-col gap-3">
        {cameras.map((camera) => (
          <Link
            key={camera.id}
            href={`/moderate/cameras/${camera.id}`}
            className="flex items-center justify-between rounded border border-parchment/20 p-4 transition hover:border-amber/40"
          >
            <div>
              <p className="font-heading text-sm text-parchment">{TYPE_LABEL[camera.type]}</p>
              <p className="font-label text-xs text-parchment/50">
                {OPERATOR_CATEGORY_LABEL[camera.operatorCategory]}
                {camera.operator && ` - ${camera.operator}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-label text-xs text-amber">{MODERATION_STATE_LABEL[camera.moderationState]}</p>
              <p className="font-label text-xs text-parchment/50">{dateFormatter.format(camera.createdAt)}</p>
            </div>
          </Link>
        ))}

        {cameras.length === 0 && (
          <p className="text-sm text-parchment/50">
            {stateFilter || typeFilter || statusFilter ? "No cameras match that filter." : "No live cameras yet."}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between font-label text-xs text-parchment/50">
          {page > 1 ? (
            <Link
              href={`?${buildQueryString({ ...params, page: String(page - 1) })}`}
              className="underline decoration-amber/50 underline-offset-2 hover:text-amber hover:decoration-amber"
            >
              &larr; Prev
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`?${buildQueryString({ ...params, page: String(page + 1) })}`}
              className="underline decoration-amber/50 underline-offset-2 hover:text-amber hover:decoration-amber"
            >
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
