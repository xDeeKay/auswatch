import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { deactivateModerator } from "@/lib/actions/admin-moderators";

export default async function RemoveModeratorPage({ params }: { params: Promise<{ id: string }> }) {
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

  const moderator = await prisma.moderatorProfile.findUnique({ where: { id }, include: { user: true } });
  if (!moderator) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-20 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
      <h1 className="font-heading text-lg text-parchment">Remove {moderator.user?.name ?? moderator.email}?</h1>
      <p className="text-sm text-parchment/70">
        This revokes their sign-in and every privilege, but keeps their moderation history intact. It can be
        undone later from the moderators list.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/admin/moderators"
          className="rounded border border-parchment/20 px-4 py-2 font-mono text-sm text-parchment/70 transition hover:border-amber hover:text-amber"
        >
          Cancel
        </Link>
        <form
          action={async () => {
            "use server";
            const result = await deactivateModerator(id);
            if (result.status === "ok") {
              redirect("/admin/moderators");
            }
          }}
        >
          <button
            type="submit"
            className="rounded border border-error bg-error/10 px-4 py-2 font-mono text-sm text-error transition hover:bg-error/20"
          >
            Remove access
          </button>
        </form>
      </div>
    </main>
  );
}
