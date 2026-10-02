import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AuState, CameraType, CaptureType, ModeratorRole, OperatorCategory } from "@/generated/prisma/enums";
import { TYPE_LABEL, TYPE_ORDER, OPERATOR_CATEGORY_LABEL, CAPTURE_LABEL, CAPTURE_ORDER } from "@/lib/camera-labels";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { requireModerator } from "@/lib/moderator-access";
import {
  listTickets,
  DEFAULT_TICKET_SORT,
  type TicketFilters,
  type TicketKind,
  type TicketSort,
  type TicketSortDirection,
  type TicketSortField,
} from "@/lib/tickets";
import { parsePageParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = {
  title: "AusWatch - Moderate",
};

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const PAGE_SIZE_OPTIONS = { defaultPageSize: 20, maxPageSize: 100 };

function isTicketKind(value: string | undefined): value is TicketKind {
  return value === "submission" || value === "correction";
}

const SORT_FIELDS: TicketSortField[] = ["kind", "createdAt", "cameraType", "captures", "operatorCategory", "state"];

function isTicketSortField(value: string | undefined): value is TicketSortField {
  return SORT_FIELDS.includes(value as TicketSortField);
}

function isTicketSortDirection(value: string | undefined): value is TicketSortDirection {
  return value === "asc" || value === "desc";
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return new URLSearchParams(entries).toString();
}

const SORT_HEADERS: { field: TicketSortField; label: string }[] = [
  { field: "createdAt", label: "SUBMITTED" },
  { field: "kind", label: "NEW / CORRECTION" },
  { field: "cameraType", label: "CAMERA TYPE" },
  { field: "captures", label: "APPEARS TO CAPTURE" },
  { field: "operatorCategory", label: "OPERATOR CATEGORY" },
  { field: "state", label: "STATE/TERRITORY" },
];

const OPERATOR_CATEGORY_ORDER: OperatorCategory[] = [
  OperatorCategory.state_police,
  OperatorCategory.local_council,
  OperatorCategory.transport_authority,
  OperatorCategory.private,
  OperatorCategory.unknown,
];

export default async function ModeratePage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    type?: string;
    kind?: string;
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

  const filters: TicketFilters = {};
  if (params.state && (Object.values(AuState) as string[]).includes(params.state)) {
    filters.state = params.state as AuState;
  }
  if (params.type && (Object.values(CameraType) as string[]).includes(params.type)) {
    filters.cameraType = params.type as CameraType;
  }
  if (params.captures && (Object.values(CaptureType) as string[]).includes(params.captures)) {
    filters.captures = params.captures as CaptureType;
  }
  if (params.operatorCategory && (Object.values(OperatorCategory) as string[]).includes(params.operatorCategory)) {
    filters.operatorCategory = params.operatorCategory as OperatorCategory;
  }
  if (isTicketKind(params.kind)) {
    filters.kind = params.kind;
  }

  const sort: TicketSort = {
    field: isTicketSortField(params.sort) ? params.sort : DEFAULT_TICKET_SORT.field,
    direction: isTicketSortDirection(params.dir) ? params.dir : DEFAULT_TICKET_SORT.direction,
  };

  function sortHref(field: TicketSortField): string {
    const direction: TicketSortDirection = sort.field === field && sort.direction === "asc" ? "desc" : "asc";
    return `?${buildQueryString({ ...params, sort: field, dir: direction, page: undefined })}`;
  }

  const pageParams = parsePageParams({ page: params.page }, PAGE_SIZE_OPTIONS);
  const result = await listTickets(profile, filters, pageParams, sort);

  const isAdmin = profile.role === ModeratorRole.admin;
  const availableStates = (
    isAdmin ? Object.values(AuState) : Array.from(new Set(profile.grants.map((g) => g.state)))
  ).sort((a, b) => STATE_LABEL[a].localeCompare(STATE_LABEL[b]));
  const availableCameraTypes = isAdmin
    ? TYPE_ORDER
    : TYPE_ORDER.filter((t) => profile.grants.some((g) => g.cameraType === t));

  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <>
      <PageHeader
        title="Review queue"
        description={
          <>
            {result.total} pending ticket{result.total === 1 ? "" : "s"}
            {result.total > 0 && ` (showing ${rangeStart}-${rangeEnd})`}
          </>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label>NEW / CORRECTION</Label>
          <Select name="kind" defaultValue={params.kind ?? ""} className="w-auto">
            <option value="">New and corrections</option>
            <option value="submission">New submissions only</option>
            <option value="correction">Corrections only</option>
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

      {result.items.length === 0 ? (
        <p className="text-sm text-foreground/50">Nothing pending review right now.</p>
      ) : (
        <>
          <table className="hidden self-start text-sm desktop:table">
            <thead>
              <tr className="text-left font-label text-xs font-normal text-amber">
                {SORT_HEADERS.map(({ field, label }, index) => (
                  <th key={field} className={`pb-2 font-normal ${index < SORT_HEADERS.length - 1 ? "pr-4" : ""}`}>
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
              {result.items.map((ticket, index) => {
                const href = `/moderate/cameras/${ticket.cameraId}`;
                const textTone = index % 2 === 0 ? "text-foreground/80" : "text-foreground/60";
                const isLastRow = index === result.items.length - 1;

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
                  <tr
                    key={`${ticket.kind}-${ticket.id}`}
                    className={`group border-t border-foreground/10 ${isLastRow ? "border-b" : ""}`}
                  >
                    {cell(dateFormatter.format(ticket.createdAt))}
                    {cell(ticket.kind === "submission" ? "New Submission" : "Correction")}
                    {cell(TYPE_LABEL[ticket.camera.type])}
                    {cell(CAPTURE_LABEL[ticket.camera.captures])}
                    {cell(OPERATOR_CATEGORY_LABEL[ticket.camera.operatorCategory])}
                    {cell(ticket.state ? STATE_LABEL[ticket.state] : "Unresolved", true)}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-col desktop:hidden">
            {result.items.map((ticket, index) => {
              const href = `/moderate/cameras/${ticket.cameraId}`;
              const isLastRow = index === result.items.length - 1;

              return (
                <Link
                  key={`${ticket.kind}-${ticket.id}`}
                  href={href}
                  className={`flex flex-col gap-1 border-t border-foreground/10 py-3 transition hover:bg-foreground/[0.03] ${isLastRow ? "border-b" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{TYPE_LABEL[ticket.camera.type]}</span>
                    <span className="whitespace-nowrap text-xs text-foreground/50">
                      {dateFormatter.format(ticket.createdAt)}
                    </span>
                  </div>
                  <div className={ticket.kind === "submission" ? "text-xs text-amber" : "text-xs text-foreground/55"}>
                    {ticket.kind === "submission" ? "New Submission" : "Correction"}
                  </div>
                  <div className="text-sm text-foreground/65">
                    {CAPTURE_LABEL[ticket.camera.captures]} &middot; {OPERATOR_CATEGORY_LABEL[ticket.camera.operatorCategory]}
                  </div>
                  <div className="text-xs text-foreground/50">
                    {ticket.state ? STATE_LABEL[ticket.state] : "Unresolved"}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(targetPage) => `?${buildQueryString({ ...params, page: String(targetPage) })}`}
      />
    </>
  );
}
