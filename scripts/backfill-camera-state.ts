import "dotenv/config";
import { prisma } from "@/lib/db";
import { deriveAuState } from "@/lib/au-state";

const BATCH_SIZE = 200;

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let resolved = 0;
  let unresolved = 0;
  let skippedOverride = 0;

  for (;;) {
    const cameras = await prisma.camera.findMany({
      where: { stateOverride: false },
      select: { id: true, lat: true, lng: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (cameras.length === 0) break;

    for (const camera of cameras) {
      scanned++;
      const state = deriveAuState({ lat: camera.lat, lng: camera.lng });
      if (state) resolved++;
      else unresolved++;
      await prisma.camera.update({
        where: { id: camera.id },
        data: { state },
      });
    }

    cursor = cameras[cameras.length - 1]!.id;
  }

  const overrideCount = await prisma.camera.count({ where: { stateOverride: true } });
  skippedOverride = overrideCount;

  console.log(`Scanned ${scanned} camera(s): ${resolved} resolved to a state, ${unresolved} unresolved (left null, needs manual review).`);
  console.log(`Skipped ${skippedOverride} camera(s) with an existing manual state override.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
