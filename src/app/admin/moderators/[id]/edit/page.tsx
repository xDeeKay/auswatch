import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AuditEntityType, ModeratorRole } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/moderator-access";
import { updateModeratorPrivileges } from "@/lib/actions/admin-moderators";
import { revertAuditLogEntry } from "@/lib/actions/audit-log";
import { GrantMatrix, type GrantMatrixDefaults } from "@/components/GrantMatrix";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
import { formatAuditPayload } from "@/lib/audit-log-format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AusWatch - Edit moderator",
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function EditModeratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  const moderator = await prisma.moderatorProfile.findUnique({
    where: { id },
    include: { user: true, grants: true },
  });

  if (!moderator) {
    notFound();
  }

  const history = await prisma.auditLogEntry.findMany({
    where: { entityType: AuditEntityType.moderator_profile, entityId: id },
    include: { actor: true, revertedBy: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const defaults: GrantMatrixDefaults = {};
  for (const g of moderator.grants) {
    defaults[`${g.state}:${g.cameraType}`] = { canView: g.canView, canAct: g.canAct };
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Breadcrumb href="/admin/moderators" label="Back to moderators" />
        <PageHeader title={`Edit ${moderator.user?.name ?? moderator.email}`} description={moderator.email} />
      </div>

      <form
        action={async (formData: FormData) => {
          "use server";
          const result = await updateModeratorPrivileges(id, formData);
          if (result.status === "ok") {
            redirect("/admin/moderators");
          }
        }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1">
          <Label>ROLE</Label>
          <Select name="role" defaultValue={moderator.role} className="max-w-xs">
            <option value={ModeratorRole.moderator}>Moderator (scoped)</option>
            <option value={ModeratorRole.admin}>Admin (unrestricted)</option>
          </Select>
          <p className="text-xs text-foreground/50">
            The grant matrix below only applies to the Moderator role. Admins have full access and ignore it.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>GRANTS</Label>
          <GrantMatrix defaults={defaults} />
        </div>

        <Button type="submit" className="self-start">
          Save privileges
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-foreground">History</h2>
        {history.length === 0 && <p className="text-sm text-foreground/50">No history yet.</p>}
        <ol className="flex flex-col gap-2">
          {history.map((entry) => (
            <li key={entry.id} className="rounded border border-foreground/10 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-label text-xs text-foreground/50">
                  {dateTimeFormatter.format(entry.createdAt)} - {AUDIT_ACTION_LABEL[entry.action]} by{" "}
                  {entry.actor.name ?? entry.actor.email ?? "Unknown"}
                  {entry.revertedAt && (
                    <Badge tone="error" className="ml-2">
                      REVERTED
                    </Badge>
                  )}
                </p>
                {entry.revertedAt === null && (
                  <form
                    action={async () => {
                      "use server";
                      await revertAuditLogEntry(entry.id);
                    }}
                  >
                    <Button type="submit" tone="destructive" size="xs">
                      Revert
                    </Button>
                  </form>
                )}
              </div>
              {entry.summary && <p className="mt-1 text-foreground/85">{entry.summary}</p>}
              <p className="mt-1 font-label text-xs text-foreground/50">
                {formatAuditPayload(entry.after)
                  .map((row) => `${row.label}: ${row.text}`)
                  .join(" - ")}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
