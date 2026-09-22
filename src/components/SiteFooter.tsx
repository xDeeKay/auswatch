import Link from "next/link";

const footerLinkClass = "font-label text-xs text-parchment/60 transition hover:text-amber";

export function SiteFooter() {
  return (
    <>
      <footer className="border-t border-parchment/10 px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 text-center min-[480px]:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <p className="font-label text-xs text-parchment/50">INFO</p>
              <nav className="flex flex-col items-center gap-2">
                <Link href="/about" className={footerLinkClass}>
                  About Us
                </Link>
                <Link href="/privacy" className={footerLinkClass}>
                  Privacy Policy
                </Link>
                <Link href="/terms" className={footerLinkClass}>
                  Terms of Service
                </Link>
              </nav>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="font-label text-xs text-parchment/50">CONTACT</p>
              <nav className="flex flex-col items-center gap-2">
                <a href="mailto:contact@auswatch.org" className={footerLinkClass}>
                  contact@auswatch.org
                </a>
                <a href="mailto:media@auswatch.org" className={footerLinkClass}>
                  media@auswatch.org
                </a>
                <a href="mailto:legal@auswatch.org" className={footerLinkClass}>
                  legal@auswatch.org
                </a>
              </nav>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="font-label text-xs text-parchment/50">CONTRIBUTE</p>
              <nav className="flex flex-col items-center gap-2">
                <Link href="/report" className={footerLinkClass}>
                  Submit Camera
                </Link>
                <a
                  href="https://github.com/xDeeKay/auswatch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  Fork on GitHub
                </a>
                <Link href="/moderate/sign-in" className={footerLinkClass}>
                  Mod Portal
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </footer>
      <div className="border-t border-parchment/10 px-6 py-6">
        <p className="text-center font-label text-xs text-parchment/40">
          &copy; 2026 AusWatch. All rights reserved.
        </p>
      </div>
    </>
  );
}
