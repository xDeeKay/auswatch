import { prisma } from "@/lib/db";
import { haversineMeters, computeBoundingBox, type BoundingBox } from "@/lib/geo";
import { requireEnvNumber } from "@/lib/required-env";
import { SensitiveZoneCategory, SensitiveSiteMatchSource } from "@/generated/prisma/enums";

type Point = { lat: number; lng: number };

export type SensitiveSiteMatchResult = {
  source: SensitiveSiteMatchSource;
  category: SensitiveZoneCategory | null;
  distanceMeters: number | null;
  lat: number | null;
  lng: number | null;
  zoneId?: string;
  detail: string;
};

export type SensitiveSiteCheckError = {
  source: SensitiveSiteMatchSource;
  message: string;
};

export type SensitiveSiteCheckResult = {
  matches: SensitiveSiteMatchResult[];
  checkErrors: SensitiveSiteCheckError[];
};

type ZoneRow = {
  id: string;
  category: SensitiveZoneCategory;
  lat: number;
  lng: number;
  radiusMeters: number;
};

export function matchZones(point: Point, zones: ZoneRow[]): SensitiveSiteMatchResult[] {
  const matches: SensitiveSiteMatchResult[] = [];

  for (const zone of zones) {
    const distanceMeters = haversineMeters(point, { lat: zone.lat, lng: zone.lng });
    if (distanceMeters <= zone.radiusMeters) {
      matches.push({
        source: SensitiveSiteMatchSource.manual_zone,
        category: zone.category,
        distanceMeters,
        lat: zone.lat,
        lng: zone.lng,
        zoneId: zone.id,
        detail: "",
      });
    }
  }

  return matches;
}

export async function checkManualZones(point: Point): Promise<SensitiveSiteMatchResult[]> {
  const zones = await prisma.sensitiveZone.findMany({ where: { active: true } });
  return matchZones(point, zones);
}

const OSM_TAG_CATEGORY_RULES: Array<{
  keys: string[];
  values?: string[];
  category: SensitiveZoneCategory;
}> = [
  { keys: ["amenity"], values: ["school", "kindergarten", "childcare"], category: SensitiveZoneCategory.school },
  { keys: ["landuse"], values: ["military"], category: SensitiveZoneCategory.military },
  { keys: ["military"], category: SensitiveZoneCategory.military },
  { keys: ["amenity"], values: ["embassy"], category: SensitiveZoneCategory.embassy },
  { keys: ["diplomatic"], category: SensitiveZoneCategory.embassy },
  { keys: ["amenity"], values: ["prison", "courthouse"], category: SensitiveZoneCategory.correctional },
];

export function mapOsmTagsToCategory(tags: Record<string, string>): SensitiveZoneCategory | null {
  for (const rule of OSM_TAG_CATEGORY_RULES) {
    for (const key of rule.keys) {
      const value = tags[key];
      if (value === undefined) continue;
      if (!rule.values || rule.values.includes(value)) {
        return rule.category;
      }
    }
  }
  return null;
}

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Live submissions and corrections match against a locally cached copy of
// this data (see checkOsmCache below and sensitive-site-cache-refresh.ts)
// rather than querying Overpass inline, since sensitive sites don't move
// day to day and a live per-submission query both hammers the shared public
// API and blocks the submit response on its latency. fetchOsmFeaturesInBbox
// is the shared fetch used both by the ACT bulk import and the scheduled
// cache refresh; matching against the returned feature list then happens
// locally per point, the same way matchZones already does for SensitiveZone.
export type OsmSensitiveFeature = {
  lat: number;
  lng: number;
  category: SensitiveZoneCategory;
  detail: string;
};

const BBOX_QUERY_TIMEOUT_SECONDS = 180;

function buildOverpassBboxQuery(bbox: BoundingBox): string {
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `
    [out:json][timeout:${BBOX_QUERY_TIMEOUT_SECONDS}];
    (
      node["amenity"~"^(school|kindergarten|childcare|embassy|prison|courthouse)$"](${box});
      way["amenity"~"^(school|kindergarten|childcare|embassy|prison|courthouse)$"](${box});
      node["landuse"="military"](${box});
      way["landuse"="military"](${box});
      node["military"](${box});
      way["military"](${box});
      node["diplomatic"](${box});
      way["diplomatic"](${box});
    );
    out center tags;
  `.trim();
}

export async function fetchOsmFeaturesInBbox(bbox: BoundingBox): Promise<OsmSensitiveFeature[]> {
  const timeoutMs = requireEnvNumber("OVERPASS_TIMEOUT_MS");

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AusWatch/0.1 (auswatch.org; sensitive-site-bulk-check)",
    },
    body: `data=${encodeURIComponent(buildOverpassBboxQuery(bbox))}`,
    signal: AbortSignal.timeout(Math.max(timeoutMs, BBOX_QUERY_TIMEOUT_SECONDS * 1000)),
  });

  if (!response.ok) {
    throw new Error(`Overpass bounding-box query failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { elements?: OverpassElement[] };
  const elements = body.elements ?? [];

  const features: OsmSensitiveFeature[] = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    const category = mapOsmTagsToCategory(tags);
    if (!category) continue;

    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat === undefined || lng === undefined) continue;

    features.push({
      lat,
      lng,
      category,
      detail: tags.amenity ?? tags.landuse ?? tags.military ?? tags.diplomatic ?? "",
    });
  }

  return features;
}

export function matchOsmFeatures(
  point: Point,
  features: OsmSensitiveFeature[],
  radiusMeters: number
): SensitiveSiteMatchResult[] {
  const matches: SensitiveSiteMatchResult[] = [];

  for (const feature of features) {
    const distanceMeters = haversineMeters(point, { lat: feature.lat, lng: feature.lng });
    if (distanceMeters <= radiusMeters) {
      matches.push({
        source: SensitiveSiteMatchSource.osm_overpass,
        category: feature.category,
        distanceMeters,
        lat: feature.lat,
        lng: feature.lng,
        detail: feature.detail,
      });
    }
  }

  return matches;
}

async function checkOsmCache(
  point: Point
): Promise<{ matches: SensitiveSiteMatchResult[]; error: string | null }> {
  const radiusMeters = requireEnvNumber("OSM_SENSITIVE_SITE_CHECK_RADIUS_METERS");
  const maxAgeHours = requireEnvNumber("OSM_SENSITIVE_SITE_CACHE_MAX_AGE_HOURS");

  const newest = await prisma.sensitiveSiteOsmCache.findFirst({
    orderBy: { refreshedAt: "desc" },
    select: { refreshedAt: true },
  });

  if (!newest) {
    return { matches: [], error: "Sensitive-site cache has not been populated yet" };
  }

  const ageHours = (Date.now() - newest.refreshedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours > maxAgeHours) {
    return {
      matches: [],
      error: `Sensitive-site cache is stale (last refreshed ${ageHours.toFixed(1)}h ago)`,
    };
  }

  const bbox = computeBoundingBox([point], radiusMeters);
  const rows = await prisma.sensitiveSiteOsmCache.findMany({
    where: {
      lat: { gte: bbox.south, lte: bbox.north },
      lng: { gte: bbox.west, lte: bbox.east },
    },
  });

  return { matches: matchOsmFeatures(point, rows, radiusMeters), error: null };
}

export async function checkSensitiveSite(point: Point): Promise<SensitiveSiteCheckResult> {
  const [manualMatches, osmResult] = await Promise.all([
    checkManualZones(point),
    checkOsmCache(point),
  ]);

  const checkErrors: SensitiveSiteCheckError[] = osmResult.error
    ? [{ source: SensitiveSiteMatchSource.check_error, message: osmResult.error }]
    : [];

  return {
    matches: [...manualMatches, ...osmResult.matches],
    checkErrors,
  };
}
