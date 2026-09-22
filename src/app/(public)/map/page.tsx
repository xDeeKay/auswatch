import type { Metadata } from "next";
import Map from "@/components/Map";
import { getCameras } from "@/lib/cameras";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AusWatch - Map",
  description: "The live, moderated map of surveillance infrastructure documented across Australia.",
};

export default async function MapPage() {
  const cameras = await getCameras();

  return (
    <main className="h-full">
      <Map cameras={cameras} />
    </main>
  );
}
