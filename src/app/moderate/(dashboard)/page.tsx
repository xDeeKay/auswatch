import type { Metadata } from "next";
import Link from "next/link";
import { AuState, CameraType, ModeratorRole, SensitiveSiteMatchSource } from "@/generated/prisma/enums";
import { TYPE_LABEL, TYPE_ORDER, OPERATOR_CATEGORY_LABEL } from "@/lib/camera-labels";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { requireModerator } from "@/lib/moderator-access";
import { listTickets, type TicketFilters, type TicketKind, type TicketSort } from "@/lib/tickets";
import { parsePageParams } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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

function isTicketSort(value: string | undefined): value is TicketSort {
  return value === "oldest" || value === "newest";
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return new URLSearchParams(entries).toString();
}

export default async function ModeratePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; type?: string; kind?: string; sort?: string; page?: string }>;
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
  if (isTicketKind(params.kind)) {
    filters.kind = params.kind;
  }

  const sort: TicketSort = isTicketSort(params.sort) ? params.sort : "oldest";

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
          <Label>KIND</Label>
          <Select name="kind" defaultValue={params.kind ?? ""} className="w-auto">
            <option value="">New and corrections</option>
            <option value="submission">New submissions only</option>
            <option value="correction">Corrections only</option>
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
          <Label>SORT</Label>
          <Select name="sort" defaultValue={sort} className="w-auto">
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </Select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="flex flex-col gap-2">
        {result.items.map((ticket) => {
          const hasCheckError =
            ticket.kind === "submission" &&
            ticket.camera.sensitiveSiteMatches.some((m) => m.source === SensitiveSiteMatchSource.check_error);
          const hasMatch =
            ticket.kind === "submission" &&
            ticket.camera.sensitiveSiteMatches.some((m) => m.source !== SensitiveSiteMatchSource.check_error);

          return (
            <Link
              key={`${ticket.kind}-${ticket.id}`}
              href={`/moderate/cameras/${ticket.cameraId}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-foreground/20 p-4 transition hover:border-amber/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ticket.kind === "submission" ? "amber" : "neutral"}>
                  {ticket.kind === "submission" ? "NEW SUBMISSION" : "CORRECTION"}
                </Badge>
                {hasCheckError && <Badge tone="error">CHECK FAILED</Badge>}
                {hasMatch && <Badge tone="amber">SENSITIVE SITE</Badge>}
                <div>
                  <p className="font-heading text-sm text-foreground">{TYPE_LABEL[ticket.camera.type]}</p>
                  <p className="font-label text-xs text-foreground/50">
                    {OPERATOR_CATEGORY_LABEL[ticket.camera.operatorCategory]}
                    {ticket.camera.operator && ` - ${ticket.camera.operator}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-label text-xs text-amber">
                  {ticket.state ? STATE_LABEL[ticket.state] : "Unresolved"}
                </p>
                <p className="font-label text-xs text-foreground/50">{dateFormatter.format(ticket.createdAt)}</p>
              </div>
            </Link>
          );
        })}

        {result.items.length === 0 && <p className="text-sm text-foreground/50">Nothing pending review right now.</p>}
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between font-label text-xs text-foreground/50">
          {result.page > 1 ? (
            <Link
              href={`?${buildQueryString({ ...params, page: String(result.page - 1) })}`}
              className="underline decoration-amber/50 underline-offset-2 hover:text-amber hover:decoration-amber"
            >
              &larr; Prev
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link
              href={`?${buildQueryString({ ...params, page: String(result.page + 1) })}`}
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
