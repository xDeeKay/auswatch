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
        <p className="font-mono text-xs text-parchment/50">
          {cameras.length} sites tracked
        </p>
      </header>
      <div className="flex-1">
        <Map cameras={cameras} />
      </div>
    </main>
  );
}
