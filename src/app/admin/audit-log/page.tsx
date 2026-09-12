import Link from "next/link";
import { AuditActionType, AuditEntityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { listAuditLogEntries, type AuditLogFilters } from "@/lib/audit-log-query";
import { parsePageParams } from "@/lib/pagination";
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from "@/lib/audit-labels";
import { formatAuditPayload } from "@/lib/audit-log-format";
import { revertAuditLogEntry } from "@/lib/actions/audit-log";

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const filterSelectClass =
  "rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";

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

  if (access.status !== "ok") {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">
          {access.status === "unauthenticated" ? "Admin sign in required" : "Admin access required"}
        </h1>
        <p className="text-sm text-parchment/70">
          {access.status === "unauthenticated"
            ? "Sign in with a moderator account that has admin privileges."
            : "This area is restricted to admins."}
        </p>
        <a
          href="/moderate/sign-in"
          className="rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Go to sign in
        </a>
      </main>
    );
  }

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
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Audit log</h1>
        <p className="mt-2 text-sm text-parchment/70">
          {result.total} entr{result.total === 1 ? "y" : "ies"}
          {result.total > 0 && ` (showing ${rangeStart}-${rangeEnd})`}
        </p>
        <Link
          href="/admin/moderators"
          className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Back to moderators
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">ENTITY</label>
          <select name="entityType" defaultValue={params.entityType ?? ""} className={filterSelectClass}>
            <option value="">All entities</option>
            {Object.values(AuditEntityType).map((type) => (
              <option key={type} value={type}>
                {AUDIT_ENTITY_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">ACTION</label>
          <select name="action" defaultValue={params.action ?? ""} className={filterSelectClass}>
            <option value="">All actions</option>
            {Object.values(AuditActionType).map((action) => (
              <option key={action} value={action}>
                {AUDIT_ACTION_LABEL[action]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">ACTOR</label>
          <select name="actorId" defaultValue={params.actorId ?? ""} className={filterSelectClass}>
            <option value="">Everyone</option>
            {actors
              .filter((actor) => actor.userId)
              .map((actor) => (
                <option key={actor.userId} value={actor.userId!}>
                  {actor.user?.name ?? actor.email}
                </option>
              ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded border border-amber bg-amber/10 px-4 py-1.5 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Filter
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {result.items.map((entry) => {
          const beforeRows = formatAuditPayload(entry.before);
          const afterRows = formatAuditPayload(entry.after);
          const href = entityHref(entry.entityType, entry.entityId, entry.after);
          const canRevert = entry.revertedAt === null;

          return (
            <div key={entry.id} className="rounded border border-parchment/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-parchment/30 px-1.5 py-0.5 font-mono text-xs tracking-[0.05em] text-parchment/70">
                      {AUDIT_ENTITY_LABEL[entry.entityType]}
                    </span>
                    <h2 className="font-heading text-sm text-parchment">{AUDIT_ACTION_LABEL[entry.action]}</h2>
                    {entry.revertedAt && (
                      <span className="rounded border border-error/40 px-1.5 py-0.5 font-mono text-xs tracking-[0.05em] text-error">
                        REVERTED
                      </span>
                    )}
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
                    <button
                      type="submit"
                      className="rounded border border-error bg-error/10 px-3 py-1.5 font-mono text-xs text-error transition hover:bg-error/20"
                    >
                      Revert
                    </button>
                  </form>
                )}
              </div>

              {(beforeRows.length > 0 || afterRows.length > 0) && (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-xs tracking-[0.05em] text-amber">
                      <th className="pb-1 pr-4">FIELD</th>
                      <th className="pb-1 pr-4">BEFORE</th>
                      <th className="pb-1">AFTER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {afterRows.map((row) => {
                      const beforeRow = beforeRows.find((b) => b.key === row.key);
                      return (
                        <tr key={row.key} className="border-t border-parchment/10">
                          <td className="py-1.5 pr-4 text-parchment/70">{row.label}</td>
                          <td className="py-1.5 pr-4 text-parchment/85">{beforeRow?.text ?? "(none)"}</td>
                          <td className="py-1.5 text-amber">{row.text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
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
    </main>
  );
}
