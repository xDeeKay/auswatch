import { prisma } from "@/lib/db";
import { fetchOsmFeaturesInBbox } from "@/lib/sensitive-site-check";
import { AUSTRALIA_BOUNDS } from "@/lib/map-constants";
import type { BoundingBox } from "@/lib/geo";

const AUSTRALIA_BBOX: BoundingBox = {
  south: AUSTRALIA_BOUNDS[0][0],
  west: AUSTRALIA_BOUNDS[0][1],
  north: AUSTRALIA_BOUNDS[1][0],
  east: AUSTRALIA_BOUNDS[1][1],
};

export type SensitiveSiteCacheRefreshResult =
  | { status: "ok"; featureCount: number; refreshedAt: Date }
  | { status: "error"; message: string };

/**
 * Replaces the whole SensitiveSiteOsmCache table with a fresh nationwide
 * fetch, atomically, so live submissions never see a mixed old/new state.
 * On failure the existing cache is left untouched rather than cleared, so a
 * transient Overpass outage just lets the cache age rather than emptying it
 * before the next scheduled attempt.
 */
export async function refreshSensitiveSiteOsmCache(): Promise<SensitiveSiteCacheRefreshResult> {
  let features;
  try {
    features = await fetchOsmFeaturesInBbox(AUSTRALIA_BBOX);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Overpass error";
    return { status: "error", message };
  }

  const refreshedAt = new Date();
  await prisma.$transaction([
    prisma.sensitiveSiteOsmCache.deleteMany({}),
    prisma.sensitiveSiteOsmCache.createMany({
      data: features.map((feature) => ({
        category: feature.category,
        lat: feature.lat,
        lng: feature.lng,
        detail: feature.detail,
        refreshedAt,
      })),
    }),
  ]);

  return { status: "ok", featureCount: features.length, refreshedAt };
}
