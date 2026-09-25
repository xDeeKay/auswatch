import Link from "next/link";
import { signOut } from "@/auth";
import { ModeratorRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { NavDrawer } from "@/components/NavDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";

const linkClass =
  "font-label text-sm text-foreground/70 transition hover:text-amber";
const itemClass = "px-5 first:pl-0";
const mobileLinkClass =
  "block py-3 font-label text-sm text-foreground/70 transition hover:text-amber";

export function ModNav({ role, userLabel }: { role: ModeratorRole; userLabel: string }) {
  const isAdmin = role === ModeratorRole.admin;

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/moderate/sign-in" });
  };

  return (
    <nav className="border-b border-foreground/10 px-6">
      <div className="flex w-full items-center justify-between py-3">
        <Link
          href="/moderate"
          className="flex items-center gap-2.5 font-heading text-lg text-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auswatch-logo.svg" alt="" width={22} height={29} />
          AusWatch
        </Link>

        <div className="flex items-center gap-1">
          <div className="hidden items-center divide-x divide-foreground/10 md:flex">
            <Link href="/moderate" className={cn(linkClass, itemClass)}>
              Queue
            </Link>
            <Link href="/moderate/cameras" className={cn(linkClass, itemClass)}>
              Cameras
            </Link>
            {isAdmin && (
              <>
                <Link href="/admin/moderators" className={cn(linkClass, itemClass)}>
                  Moderators
                </Link>
                <Link href="/admin/audit-log" className={cn(linkClass, itemClass)}>
                  Audit log
                </Link>
              </>
            )}
            <span className={cn("font-label text-xs text-foreground/50", itemClass)}>
              {userLabel}
            </span>
            <form action={signOutAction} className={itemClass}>
              <button type="submit" className={linkClass}>
                Sign out
              </button>
            </form>
          </div>

          <ThemeToggle />

          <NavDrawer>
            <Link href="/moderate" className={mobileLinkClass}>
              Queue
            </Link>
            <Link href="/moderate/cameras" className={mobileLinkClass}>
              Cameras
            </Link>
            {isAdmin && (
              <>
                <Link href="/admin/moderators" className={mobileLinkClass}>
                  Moderators
                </Link>
                <Link href="/admin/audit-log" className={mobileLinkClass}>
                  Audit log
                </Link>
              </>
            )}
            <div className="py-3 font-label text-xs text-foreground/50">{userLabel}</div>
            <form action={signOutAction}>
              <button type="submit" className={cn(mobileLinkClass, "w-full text-left")}>
                Sign out
              </button>
            </form>
          </NavDrawer>
        </div>
      </div>
    </nav>
  );
}
