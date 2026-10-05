import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalImportSource, ModerationState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { SOURCE_ATTRIBUTION } from "@/lib/source-attribution";
import { BULK_VERIFY_BATCH_SIZE, cleanImportWhere } from "@/lib/bulk-import-verify";
import { bulkVerifyCleanImports } from "@/lib/actions/bulk-verify-imports";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AusWatch - Imports",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readCount(value: string | string[] | undefined): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

async function loadSourceCounts(source: ExternalImportSource) {
  const pending = { externalSource: source, moderationState: ModerationState.pending };
  const [pendingTotal, clean, flagged] = await Promise.all([
    prisma.camera.count({ where: pending }),
    prisma.camera.count({ where: cleanImportWhere(source) }),
    prisma.camera.count({ where: { ...pending, sensitiveSiteMatches: { some: {} } } }),
  ]);
  return { source, pendingTotal, clean, flagged };
}

export default async function AdminImportsPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  const params = await searchParams;
  const verified = readCount(params.verified);
  const flagged = readCount(params.flagged);
  const unchecked = readCount(params.unchecked);
  const skipped = readCount(params.skipped);
  const error = typeof params.error === "string" ? params.error : null;

  const rows = (
    await Promise.all(Object.values(ExternalImportSource).map((source) => loadSourceCounts(source)))
  ).filter((row) => row.pendingTotal > 0);

  return (
    <>
      <PageHeader title="Imports" />

      <p className="max-w-3xl text-sm text-foreground/70">
        Records imported from official datasets arrive pending, like any other submission. Verifying here
        re-runs the sensitive-site check against current data and only verifies records with no matches and no check
        errors, up to {BULK_VERIFY_BATCH_SIZE} per click. Records the source reports as decommissioned stay removed.
        Anything flagged or unchecked stays in the queue and is reviewed individually like any other submission. Each
        verify is logged and can be reverted from the audit log.
      </p>

      {error && <p className="text-sm text-error">{error}</p>}
      {verified !== null && (
        <Card density="compact">
          <p className="font-label text-sm text-foreground/85">
            Verified {verified}. Newly flagged for review {flagged ?? 0}. Check unavailable {unchecked ?? 0}. Changed
            during the run {skipped ?? 0}.
          </p>
          {(unchecked ?? 0) > 0 && (
            <p className="mt-1 text-xs text-foreground/50">
              Records with an unavailable check were left pending. Refresh the sensitive-site cache, then run it again.
            </p>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <Card key={row.source}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-base text-foreground">{SOURCE_ATTRIBUTION[row.source].credit}</h2>
                <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-6 gap-y-1 font-label text-xs text-foreground/70">
                  <dt>Pending</dt>
                  <dd>{row.pendingTotal}</dd>
                  <dt>Clean, ready to verify</dt>
                  <dd>{row.clean}</dd>
                  <dt>Flagged, individual review</dt>
                  <dd>{row.flagged}</dd>
                </dl>
              </div>
              <form
                action={async () => {
                  "use server";
                  const result = await bulkVerifyCleanImports(row.source);
                  if (result.status === "error") {
                    redirect(`/admin/imports?error=${encodeURIComponent(result.message)}`);
                  }
                  redirect(
                    `/admin/imports?verified=${result.verified}&flagged=${result.flagged}&unchecked=${result.unchecked}&skipped=${result.skipped}`
                  );
                }}
              >
                <Button type="submit" size="sm" disabled={row.clean === 0}>
                  Verify clean records
                </Button>
              </form>
            </div>
          </Card>
        ))}

        {rows.length === 0 && <p className="text-sm text-foreground/50">No imported records are pending review.</p>}
      </div>
    </>
  );
}
