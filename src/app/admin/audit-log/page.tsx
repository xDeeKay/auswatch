import Link from "next/link";
import { AuditActionType, AuditEntityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { listAuditLogEntries, type AuditLogFilters } from "@/lib/audit-log-query";
import { parsePageParams } from "@/lib/pagination";
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from "@/lib/audit-labels";
import { formatAuditPayload } from "@/lib/audit-log-format";
import { revertAuditLogEntry } from "@/lib/actions/audit-log";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { DiffTable } from "@/components/ui/DiffTable";

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const PAGE_SIZE_OPTIONS = { defaultPageSize: 25, maxPageSize: 100 };

function noteCameraId(after: unknown): string | undefined {
  if (after && typeof after === "object" && "cameraId" in after) {
    const value = (after as { cameraId: unknown }).cameraId;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function entityHref(entityType: AuditEntityType, entityId: string, after: unknown): string | null {
  switch (entityType) {
    case AuditEntityType.camera:
      return `/moderate/cameras/${entityId}`;
    case AuditEntityType.camera_note: {
      const cameraId = noteCameraId(after);
      return cameraId ? `/moderate/cameras/${cameraId}` : null;
    }
    case AuditEntityType.moderator_profile:
      return `/admin/moderators/${entityId}/edit`;
    default:
      return null;
  }
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return new URLSearchParams(entries).toString();
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string; actorId?: string; page?: string }>;
}) {
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  const params = await searchParams;

  const filters: AuditLogFilters = {};
  if (params.entityType && (Object.values(AuditEntityType) as string[]).includes(params.entityType)) {
    filters.entityType = params.entityType as AuditEntityType;
  }
  if (params.action && (Object.values(AuditActionType) as string[]).includes(params.action)) {
    filters.action = params.action as AuditActionType;
  }
  if (params.actorId) {
    filters.actorId = params.actorId;
  }

  const pageParams = parsePageParams({ page: params.page }, PAGE_SIZE_OPTIONS);
  const [result, actors] = await Promise.all([
    listAuditLogEntries(filters, pageParams),
    prisma.moderatorProfile.findMany({ include: { user: true }, orderBy: { email: "asc" } }),
  ]);

  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <>
      <PageHeader
        title="Audit log"
        description={
          <>
            {result.total} entr{result.total === 1 ? "y" : "ies"}
            {result.total > 0 && ` (showing ${rangeStart}-${rangeEnd})`}
          </>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label>ENTITY</Label>
          <Select name="entityType" defaultValue={params.entityType ?? ""}>
            <option value="">All entities</option>
            {Object.values(AuditEntityType).map((type) => (
              <option key={type} value={type}>
                {AUDIT_ENTITY_LABEL[type]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>ACTION</Label>
          <Select name="action" defaultValue={params.action ?? ""}>
            <option value="">All actions</option>
            {Object.values(AuditActionType).map((action) => (
              <option key={action} value={action}>
                {AUDIT_ACTION_LABEL[action]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>ACTOR</Label>
          <Select name="actorId" defaultValue={params.actorId ?? ""}>
            <option value="">Everyone</option>
            {actors
              .filter((actor) => actor.userId)
              .map((actor) => (
                <option key={actor.userId} value={actor.userId!}>
                  {actor.user?.name ?? actor.email}
                </option>
              ))}
          </Select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="flex flex-col gap-4">
        {result.items.map((entry) => {
          const beforeRows = formatAuditPayload(entry.before);
          const afterRows = formatAuditPayload(entry.after);
          const diffRows = afterRows.map((row) => ({
            key: row.key,
            label: row.label,
            before: beforeRows.find((b) => b.key === row.key)?.text ?? "(none)",
            after: row.text,
          }));
          const href = entityHref(entry.entityType, entry.entityId, entry.after);
          const canRevert = entry.revertedAt === null;

          return (
            <Card key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{AUDIT_ENTITY_LABEL[entry.entityType]}</Badge>
                    <h2 className="font-heading text-sm text-parchment">{AUDIT_ACTION_LABEL[entry.action]}</h2>
                    {entry.revertedAt && <Badge tone="error">REVERTED</Badge>}
                  </div>
                  <p className="mt-1 font-mono text-xs text-parchment/50">
                    {dateTimeFormatter.format(entry.createdAt)} by{" "}
                    {entry.actor.name ?? entry.actor.email ?? "Unknown"}
                    {href && (
                      <>
                        {" "}
                        &middot;{" "}
                        <Link
                          href={href}
                          className="underline decoration-amber/50 underline-offset-2 hover:text-amber hover:decoration-amber"
                        >
                          View record
                        </Link>
                      </>
                    )}
                  </p>
                  {entry.summary && <p className="mt-1 text-sm text-parchment/85">{entry.summary}</p>}
                  {entry.revertedAt && (
                    <p className="mt-1 font-mono text-xs text-parchment/50">
                      Reverted {dateTimeFormatter.format(entry.revertedAt)} by{" "}
                      {entry.revertedBy?.name ?? entry.revertedBy?.email ?? "Unknown"}
                    </p>
                  )}
                </div>

                {canRevert && (
                  <form
                    action={async () => {
                      "use server";
                      await revertAuditLogEntry(entry.id);
                    }}
                  >
                    <Button type="submit" tone="destructive" size="sm">
                      Revert
                    </Button>
                  </form>
                )}
              </div>

              <DiffTable rows={diffRows} />
            </Card>
          );
        })}

        {result.items.length === 0 && <p className="text-sm text-parchment/50">No history yet.</p>}
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-xs text-parchment/50">
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
