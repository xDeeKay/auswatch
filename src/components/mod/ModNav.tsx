import Link from "next/link";
import { signOut } from "@/auth";
import { ModeratorRole } from "@/generated/prisma/enums";

const linkClass =
  "font-label text-sm text-parchment/70 transition hover:text-amber";

export function ModNav({ role, userLabel }: { role: ModeratorRole; userLabel: string }) {
  return (
    <nav className="border-b border-parchment/10 px-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-8 gap-y-3 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          <Link href="/moderate" className="flex items-center gap-2.5 font-heading text-lg text-parchment">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/auswatch-logo.svg" alt="" width={22} height={29} />
            AusWatch
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
          <span className="font-label text-xs text-parchment/50">{userLabel}</span>
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
