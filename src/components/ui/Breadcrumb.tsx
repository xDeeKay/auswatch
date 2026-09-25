import Link from "next/link";

export function Breadcrumb({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block font-label text-xs text-foreground/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
    >
      &larr; {label}
    </Link>
  );
}
