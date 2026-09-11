import Link from "next/link";
import { redirect } from "next/navigation";
import { ModeratorRole } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/moderator-access";
import { createModeratorProfile } from "@/lib/actions/admin-moderators";
import { GrantMatrix } from "@/components/GrantMatrix";

const inputClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment placeholder:text-parchment/30 focus:border-amber focus:outline-none";
const selectClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";

export default async function NewModeratorPage() {
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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Add a moderator</h1>
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
          const result = await createModeratorProfile(formData);
          if (result.status === "ok") {
            redirect("/admin/moderators");
          }
        }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">EMAIL</label>
          <input type="email" name="email" required className={inputClass} placeholder="mod@example.com" />
          <p className="text-xs text-parchment/50">
            A new moderator starts with zero access. Grant access below, or leave it for later.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">ROLE</label>
          <select name="role" defaultValue={ModeratorRole.moderator} className={`${selectClass} max-w-xs`}>
            <option value={ModeratorRole.moderator}>Moderator (scoped)</option>
            <option value={ModeratorRole.admin}>Admin (unrestricted)</option>
          </select>
          <p className="text-xs text-parchment/50">
            The grant matrix below only applies to the Moderator role. Admins have full access and ignore it.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">GRANTS</label>
          <GrantMatrix />
        </div>

        <button
          type="submit"
          className="self-start rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Create moderator
        </button>
      </form>
    </main>
  );
}
