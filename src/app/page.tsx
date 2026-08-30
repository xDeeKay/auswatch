import Link from "next/link";
import Map from "@/components/Map";
import { getCameras } from "@/lib/cameras";

export default async function Home() {
  const cameras = await getCameras();

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-parchment/10 px-6 py-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">
            AUSWATCH
          </p>
          <h1 className="font-heading text-lg text-parchment">
            Surveillance infrastructure map
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs text-parchment/50">
            {cameras.length} sites tracked
          </p>
          <Link
            href="/about"
            className="font-mono text-xs text-parchment/70 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
          >
            About
          </Link>
          <Link
            href="/report"
            className="font-mono text-xs text-parchment/70 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
          >
            Report a camera
          </Link>
        </div>
      </header>
      <div className="flex-1">
        <Map cameras={cameras} />
      </div>
    </main>
  );
}
