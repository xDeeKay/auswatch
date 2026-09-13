import Link from "next/link";
import { signOut } from "@/auth";
import { ModeratorRole } from "@/generated/prisma/enums";

const linkClass =
  "font-mono text-xs tracking-[0.05em] text-parchment/70 transition hover:text-amber";

export function ModNav({ role, userLabel }: { role: ModeratorRole; userLabel: string }) {
  return (
    <nav className="border-b border-parchment/10">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/moderate" className="font-mono text-xs tracking-[0.3em] text-parchment/50">
            AUSWATCH
          </Link>
          <Link href="/moderate" className={linkClass}>
            Queue
          </Link>
          <Link href="/moderate/cameras" className={linkClass}>
            Cameras
          </Link>
          {role === ModeratorRole.admin && (
            <>
              <Link href="/admin/moderators" className={linkClass}>
                Moderators
              </Link>
              <Link href="/admin/audit-log" className={linkClass}>
                Audit log
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-parchment/50">{userLabel}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/moderate/sign-in" });
            }}
          >
            <button type="submit" className={linkClass}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
