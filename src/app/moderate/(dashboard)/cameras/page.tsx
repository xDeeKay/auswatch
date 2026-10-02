import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  AuState,
  CameraStatus,
  CameraType,
  CaptureType,
  ModerationState,
  ModeratorRole,
  OperatorCategory,
} from "@/generated/prisma/enums";
import { TYPE_LABEL, TYPE_ORDER, STATUS_LABEL, OPERATOR_CATEGORY_LABEL, CAPTURE_LABEL, CAPTURE_ORDER } from "@/lib/camera-labels";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { requireModerator } from "@/lib/moderator-access";
import { parsePageParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";

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

type CameraSortField = "type" | "captures" | "operatorCategory" | "state" | "status" | "createdAt";
type CameraSortDirection = "asc" | "desc";
type CameraSort = { field: CameraSortField; direction: CameraSortDirection };

const DEFAULT_CAMERA_SORT: CameraSort = { field: "createdAt", direction: "desc" };

const CAMERA_SORT_FIELDS: CameraSortField[] = ["type", "captures", "operatorCategory", "state", "status", "createdAt"];

function isCameraSortField(value: string | undefined): value is CameraSortField {
  return CAMERA_SORT_FIELDS.includes(value as CameraSortField);
}

function isCameraSortDirection(value: string | undefined): value is CameraSortDirection {
  return value === "asc" || value === "desc";
}

function orderByFor(sort: CameraSort): Prisma.CameraOrderByWithRelationInput {
  switch (sort.field) {
    case "type":
      return { type: sort.direction };
    case "captures":
      return { captures: sort.direction };
    case "operatorCategory":
      return { operatorCategory: sort.direction };
    case "state":
      return { state: sort.direction };
    case "status":
      return { status: sort.direction };
    case "createdAt":
      return { createdAt: sort.direction };
  }
}

const CAMERA_HEADERS: { label: string; field: CameraSortField }[] = [
  { label: "CREATED", field: "createdAt" },
  { label: "CAMERA STATUS", field: "status" },
  { label: "CAMERA TYPE", field: "type" },
  { label: "APPEARS TO CAPTURE", field: "captures" },
  { label: "OPERATOR CATEGORY", field: "operatorCategory" },
  { label: "STATE/TERRITORY", field: "state" },
];

const OPERATOR_CATEGORY_ORDER: OperatorCategory[] = [
  OperatorCategory.state_police,
  OperatorCategory.local_council,
  OperatorCategory.transport_authority,
  OperatorCategory.private,
  OperatorCategory.unknown,
];

const MODERATION_FILTER_OPTIONS: ModerationState[] = [
  ModerationState.verified,
  ModerationState.removed,
];

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
  searchParams: Promise<{
    state?: string;
    type?: string;
    status?: string;
    captures?: string;
    operatorCategory?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const access = await requireModerator();
  if (access.status !== "ok") return null;
  const { profile } = access;

  const params = await searchParams;
  const sort: CameraSort = {
    field: isCameraSortField(params.sort) ? params.sort : DEFAULT_CAMERA_SORT.field,
    direction: isCameraSortDirection(params.dir) ? params.dir : DEFAULT_CAMERA_SORT.direction,
  };

  function sortHref(field: CameraSortField): string {
    const direction: CameraSortDirection = sort.field === field && sort.direction === "asc" ? "desc" : "asc";
    return `?${buildQueryString({ ...params, sort: field, dir: direction, page: undefined })}`;
  }

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
  const operatorCategoryFilter =
    params.operatorCategory && (Object.values(OperatorCategory) as string[]).includes(params.operatorCategory)
      ? (params.operatorCategory as OperatorCategory)
      : undefined;
  const capturesFilter =
    params.captures && (Object.values(CaptureType) as string[]).includes(params.captures)
      ? (params.captures as CaptureType)
      : undefined;

  const where: Prisma.CameraWhereInput = {
    AND: [
      { moderationState: { in: MODERATION_FILTER_OPTIONS } },
      buildAccessWhere(profile),
      stateFilter ? { state: stateFilter } : {},
      typeFilter ? { type: typeFilter } : {},
      statusFilter ? { status: statusFilter } : {},
      operatorCategoryFilter ? { operatorCategory: operatorCategoryFilter } : {},
      capturesFilter ? { captures: capturesFilter } : {},
    ],
  };

  const pageParams = parsePageParams({ page: params.page }, PAGE_SIZE_OPTIONS);
  const total = await prisma.camera.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageParams.pageSize));
  const page = Math.min(Math.max(pageParams.page, 1), totalPages);

  const cameras = await prisma.camera.findMany({
    where,
    orderBy: orderByFor(sort),
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
          <Label>CAMERA STATUS</Label>
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
          <Label>APPEARS TO CAPTURE</Label>
          <Select name="captures" defaultValue={params.captures ?? ""} className="w-auto">
            <option value="">Anything</option>
            {CAPTURE_ORDER.map((captures) => (
              <option key={captures} value={captures}>
                {CAPTURE_LABEL[captures]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>OPERATOR CATEGORY</Label>
          <Select name="operatorCategory" defaultValue={params.operatorCategory ?? ""} className="w-auto">
            <option value="">Any operator</option>
            {OPERATOR_CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>
                {OPERATOR_CATEGORY_LABEL[category]}
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
        <input type="hidden" name="sort" value={sort.field} />
        <input type="hidden" name="dir" value={sort.direction} />
        <Button type="submit">Filter</Button>
      </form>

      {cameras.length === 0 ? (
        <p className="text-sm text-foreground/50">
          {stateFilter || typeFilter || statusFilter ? "No cameras match that filter." : "No live cameras yet."}
        </p>
      ) : (
        <>
          <table className="hidden self-start text-sm desktop:table">
            <thead>
              <tr className="text-left font-label text-xs font-normal text-amber">
                {CAMERA_HEADERS.map(({ label, field }, index) => (
                  <th key={label} className={`pb-2 font-normal ${index < CAMERA_HEADERS.length - 1 ? "pr-4" : ""}`}>
                    <Link href={sortHref(field)} className="inline-flex items-center gap-1 transition hover:text-foreground">
                      {label}
                      {sort.field === field && (
                        <span className="text-foreground">{sort.direction === "asc" ? "↑" : "↓"}</span>
                      )}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera, index) => {
                const href = `/moderate/cameras/${camera.id}`;
                const textTone = index % 2 === 0 ? "text-foreground/80" : "text-foreground/60";
                const isLastRow = index === cameras.length - 1;
                const cell = (content: ReactNode, isLast = false) => (
                  <td className="p-0">
                    <Link
                      href={href}
                      className={`block whitespace-nowrap py-2.5 ${isLast ? "" : "pr-4"} ${textTone} transition group-hover:bg-foreground/[0.03]`}
                    >
                      {content}
                    </Link>
                  </td>
                );

                return (
                  <tr key={camera.id} className={`group border-t border-foreground/10 ${isLastRow ? "border-b" : ""}`}>
                    {cell(dateFormatter.format(camera.createdAt))}
                    {cell(STATUS_LABEL[camera.status])}
                    {cell(TYPE_LABEL[camera.type])}
                    {cell(CAPTURE_LABEL[camera.captures])}
                    {cell(OPERATOR_CATEGORY_LABEL[camera.operatorCategory])}
                    {cell(camera.state ? STATE_LABEL[camera.state] : "Unresolved", true)}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-col desktop:hidden">
            {cameras.map((camera, index) => {
              const href = `/moderate/cameras/${camera.id}`;
              const isLastRow = index === cameras.length - 1;

              return (
                <Link
                  key={camera.id}
                  href={href}
                  className={`flex flex-col gap-1 border-t border-foreground/10 py-3 transition hover:bg-foreground/[0.03] ${isLastRow ? "border-b" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{TYPE_LABEL[camera.type]}</span>
                    <span className="whitespace-nowrap text-xs text-foreground/50">
                      {dateFormatter.format(camera.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/55">{STATUS_LABEL[camera.status]}</div>
                  <div className="text-sm text-foreground/65">
                    {CAPTURE_LABEL[camera.captures]} &middot; {OPERATOR_CATEGORY_LABEL[camera.operatorCategory]}
                  </div>
                  <div className="text-xs text-foreground/50">
                    {camera.state ? STATE_LABEL[camera.state] : "Unresolved"}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(targetPage) => `?${buildQueryString({ ...params, page: String(targetPage) })}`}
      />
    </>
  );
}
