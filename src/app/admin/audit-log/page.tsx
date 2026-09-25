import type { Metadata } from "next";
import Link from "next/link";
import { AuditActionType, AuditEntityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { listAuditLogEntries, type AuditLogFilters } from "@/lib/audit-log-query";
import { AUDIT_ENTITY_BY_ACTION } from "@/lib/audit-log-payloads";
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

export const metadata: Metadata = {
  title: "AusWatch - Audit log",
};

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

/**
 * Groups the action filter's options for display. Mirrors AUDIT_ENTITY_BY_ACTION
 * (the entity each action is actually logged against, used for querying and
 * linking), except camera_correction_approve reads as a correction action to a
 * moderator even though it's logged against the camera entity, since approving
 * a correction is what changes the camera's fields.
 */
const FILTER_GROUP_BY_ACTION: Record<AuditActionType, AuditEntityType> = {
  ...AUDIT_ENTITY_BY_ACTION,
  camera_correction_approve: AuditEntityType.correction_report,
};

const ACTIONS_BY_ENTITY = Object.values(AuditEntityType).map((entityType) => ({
  entityType,
  actions: Object.values(AuditActionType).filter((action) => FILTER_GROUP_BY_ACTION[action] === entityType),
}));

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actorId?: string; page?: string }>;
}) {
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  const params = await searchParams;

  const filters: AuditLogFilters = {};
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

  // Revert eligibility is per-entity (see assertRevertable in
  // audit-log-revert.ts: only an entity's single most recent unreverted
  // entry can be reverted, to force reverts to happen in order). This page
  // is a paginated, filterable view across every entity, so "first row on
  // this page" isn't a safe stand-in for "most recent overall" the way it is
  // on a single camera's own history - a page/filter can easily show an
  // entity's older entry without its true, newer head anywhere in view. Look
  // each involved entity's real head up directly instead.
  const uniqueEntities = new Map<string, { entityType: AuditEntityType; entityId: string }>();
  for (const entry of result.items) {
    const key = `${entry.entityType}:${entry.entityId}`;
    if (!uniqueEntities.has(key)) uniqueEntities.set(key, { entityType: entry.entityType, entityId: entry.entityId });
  }
  const headRows =
    uniqueEntities.size > 0
      ? await prisma.auditLogEntry.findMany({
          where: { OR: Array.from(uniqueEntities.values()) },
          select: { id: true, entityType: true, entityId: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })
      : [];
  const headEntryIdByEntity = new Map<string, string>();
  for (const row of headRows) {
    const key = `${row.entityType}:${row.entityId}`;
    if (!headEntryIdByEntity.has(key)) headEntryIdByEntity.set(key, row.id);
  }

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
          <Label>ACTION</Label>
          <Select name="action" defaultValue={params.action ?? ""}>
            <option value="">All actions</option>
            {ACTIONS_BY_ENTITY.map(({ entityType, actions }) => (
              <optgroup key={entityType} label={AUDIT_ENTITY_LABEL[entityType]}>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {AUDIT_ACTION_LABEL[action]}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>USER</Label>
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
          const canRevert =
            entry.revertedAt === null &&
            headEntryIdByEntity.get(`${entry.entityType}:${entry.entityId}`) === entry.id;

          return (
            <Card key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{AUDIT_ENTITY_LABEL[entry.entityType]}</Badge>
                    <h2 className="font-heading text-sm text-foreground">{AUDIT_ACTION_LABEL[entry.action]}</h2>
                    {entry.revertedAt && <Badge tone="error">REVERTED</Badge>}
                  </div>
                  <p className="mt-1.5 font-label text-xs text-foreground/50">
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
                  {entry.summary && <p className="mt-1 font-label text-xs text-foreground/50">{entry.summary}</p>}
                  {entry.revertedAt && (
                    <p className="mt-1 font-label text-xs text-foreground/50">
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

        {result.items.length === 0 && <p className="text-sm text-foreground/50">No history yet.</p>}
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
