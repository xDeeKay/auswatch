import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AuditEntityType, ModeratorRole } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/moderator-access";
import { updateModeratorPrivileges } from "@/lib/actions/admin-moderators";
import { revertAuditLogEntry } from "@/lib/actions/audit-log";
import { GrantMatrix, type GrantMatrixDefaults } from "@/components/GrantMatrix";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
import { formatAuditPayload } from "@/lib/audit-log-format";

const selectClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";

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
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Edit {moderator.user?.name ?? moderator.email}</h1>
        <p className="mt-1 font-mono text-xs text-parchment/50">{moderator.email}</p>
        <Link
          href="/admin/moderators"
          className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Back to moderators
        </Link>
      </header>

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
          <label className="font-mono text-xs tracking-[0.05em] text-amber">ROLE</label>
          <select name="role" defaultValue={moderator.role} className={`${selectClass} max-w-xs`}>
            <option value={ModeratorRole.moderator}>Moderator (scoped)</option>
            <option value={ModeratorRole.admin}>Admin (unrestricted)</option>
          </select>
          <p className="text-xs text-parchment/50">
            The grant matrix below only applies to the Moderator role. Admins have full access and ignore it.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">GRANTS</label>
          <GrantMatrix defaults={defaults} />
        </div>

        <button
          type="submit"
          className="self-start rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Save privileges
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-parchment">History</h2>
        {history.length === 0 && <p className="text-sm text-parchment/50">No history yet.</p>}
        <ol className="flex flex-col gap-2">
          {history.map((entry) => (
            <li key={entry.id} className="rounded border border-parchment/10 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-parchment/50">
                  {dateTimeFormatter.format(entry.createdAt)} - {AUDIT_ACTION_LABEL[entry.action]} by{" "}
                  {entry.actor.name ?? entry.actor.email ?? "Unknown"}
                  {entry.revertedAt && (
                    <span className="ml-2 rounded border border-error/40 px-1.5 py-0.5 text-error">REVERTED</span>
                  )}
                </p>
                {entry.revertedAt === null && (
                  <form
                    action={async () => {
                      "use server";
                      await revertAuditLogEntry(entry.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded border border-error bg-error/10 px-2 py-1 font-mono text-xs text-error transition hover:bg-error/20"
                    >
                      Revert
                    </button>
                  </form>
                )}
              </div>
              {entry.summary && <p className="mt-1 text-parchment/85">{entry.summary}</p>}
              <p className="mt-1 font-mono text-xs text-parchment/50">
                {formatAuditPayload(entry.after)
                  .map((row) => `${row.label}: ${row.text}`)
                  .join(" - ")}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
