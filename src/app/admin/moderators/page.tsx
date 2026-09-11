import Link from "next/link";
import { ModeratorRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { summarizeGrants } from "@/lib/moderator-grants";
import { reactivateModerator } from "@/lib/actions/admin-moderators";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function AdminModeratorsPage() {
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

  const moderators = await prisma.moderatorProfile.findMany({
    include: { user: true, grants: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
          <h1 className="font-heading text-lg text-parchment">Moderators</h1>
          <Link
            href="/moderate"
            className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
          >
            Back to review queue
          </Link>
        </div>
        <Link
          href="/admin/moderators/new"
          className="rounded border border-amber bg-amber/10 px-4 py-1.5 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Add moderator
        </Link>
      </header>

      <div className="flex flex-col gap-4">
        {moderators.map((moderator) => (
          <div
            key={moderator.id}
            className={`rounded border p-5 ${
              moderator.isActive ? "border-parchment/20" : "border-parchment/10 opacity-60"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base text-parchment">
                    {moderator.user?.name ?? moderator.email}
                  </h2>
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-xs tracking-[0.05em] ${
                      moderator.role === ModeratorRole.admin
                        ? "border-amber/40 text-amber"
                        : "border-parchment/30 text-parchment/70"
                    }`}
                  >
                    {moderator.role === ModeratorRole.admin ? "ADMIN" : "MODERATOR"}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-xs tracking-[0.05em] ${
                      moderator.isActive ? "border-parchment/30 text-parchment/70" : "border-error/40 text-error"
                    }`}
                  >
                    {moderator.isActive ? "ACTIVE" : "DEACTIVATED"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-parchment/50">{moderator.email}</p>
                <p className="mt-2 text-sm text-parchment/85">
                  {moderator.role === ModeratorRole.admin
                    ? "Unrestricted access to every state and camera type."
                    : summarizeGrants(moderator.grants)}
                </p>
                <p className="mt-2 font-mono text-xs text-parchment/50">
                  Added {dateFormatter.format(moderator.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Link
                  href={`/admin/moderators/${moderator.id}/edit`}
                  className="rounded border border-amber bg-amber/10 px-3 py-1.5 font-mono text-sm text-amber transition hover:bg-amber/20"
                >
                  Edit
                </Link>
                {moderator.isActive ? (
                  <Link
                    href={`/admin/moderators/${moderator.id}/remove`}
                    className="rounded border border-error bg-error/10 px-3 py-1.5 font-mono text-sm text-error transition hover:bg-error/20"
                  >
                    Remove
                  </Link>
                ) : (
                  <form
                    action={async () => {
                      "use server";
                      await reactivateModerator(moderator.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded border border-amber bg-amber/10 px-3 py-1.5 font-mono text-sm text-amber transition hover:bg-amber/20"
                    >
                      Reactivate
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}

        {moderators.length === 0 && <p className="text-sm text-parchment/50">No moderators yet.</p>}
      </div>
    </main>
  );
}
