import Link from "next/link";

const linkClass = "font-label text-sm text-parchment/70 transition hover:text-amber";

export function PublicNav() {
  return (
    <nav className="border-b border-parchment/10 px-6">
      <div className="flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg text-parchment">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auswatch-logo.svg" alt="" width={22} height={29} />
          AusWatch
        </Link>
        <Link href="/map" className={linkClass}>
          Explore Map
        </Link>
        <Link href="/report" className={linkClass}>
          Submit Camera
        </Link>
        <Link href="/about" className={linkClass}>
          About Us
        </Link>
      </div>
    </nav>
  );
}
