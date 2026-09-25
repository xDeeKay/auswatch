import Link from "next/link";
import { cn } from "@/lib/cn";
import { NavDrawer } from "@/components/NavDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";

const linkClass = "font-label text-sm text-foreground/70 transition hover:text-amber";
const itemClass = "px-5 first:pl-0";
const mobileLinkClass =
  "block py-3 font-label text-sm text-foreground/70 transition hover:text-amber";

const NAV_LINKS = [
  { href: "/map", label: "Explore Map" },
  { href: "/report", label: "Submit Camera" },
  { href: "/about", label: "About Us" },
];

export function PublicNav() {
  return (
    <nav className="border-b border-foreground/10 px-6">
      <div className="flex w-full items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg text-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auswatch-logo.svg" alt="" width={22} height={29} />
          AusWatch
        </Link>

        <div className="flex items-center gap-1">
          <div className="hidden items-center divide-x divide-foreground/10 md:flex">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={cn(linkClass, itemClass)}>
                {item.label}
              </Link>
            ))}
          </div>

          <ThemeToggle />

          <NavDrawer>
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={mobileLinkClass}>
                {item.label}
              </Link>
            ))}
          </NavDrawer>
        </div>
      </div>
    </nav>
  );
}
