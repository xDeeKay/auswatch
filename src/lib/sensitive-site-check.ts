import { prisma } from "@/lib/db";
import { haversineMeters } from "@/lib/geo";
import { requireEnvNumber } from "@/lib/required-env";
import { SensitiveZoneCategory, SensitiveSiteMatchSource } from "@/generated/prisma/enums";

type Point = { lat: number; lng: number };

export type SensitiveSiteMatchResult = {
  source: SensitiveSiteMatchSource;
  category: SensitiveZoneCategory | null;
  distanceMeters: number | null;
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

const OVERPASS_QUERY_TIMEOUT_SECONDS = 10;

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function buildOverpassQuery(point: Point, radiusMeters: number): string {
  const around = `around:${radiusMeters},${point.lat},${point.lng}`;
  return `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
    (
      node(${around})[amenity~"^(school|kindergarten|childcare|embassy|prison|courthouse)$"];
      way(${around})[amenity~"^(school|kindergarten|childcare|embassy|prison|courthouse)$"];
      node(${around})[landuse=military];
      way(${around})[landuse=military];
      node(${around})[military];
      way(${around})[military];
      node(${around})[diplomatic];
      way(${around})[diplomatic];
    );
    out center tags;
  `.trim();
}

export async function checkOsmOverpass(
  point: Point
): Promise<{ matches: SensitiveSiteMatchResult[]; error: string | null }> {
  try {
    const radiusMeters = requireEnvNumber("OSM_SENSITIVE_SITE_CHECK_RADIUS_METERS");
    const timeoutMs = requireEnvNumber("OVERPASS_TIMEOUT_MS");

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "AusWatch/0.1 (auswatch.org; sensitive-site-check)",
      },
      body: `data=${encodeURIComponent(buildOverpassQuery(point, radiusMeters))}`,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return { matches: [], error: `Overpass responded with ${response.status}` };
    }

    const body = (await response.json()) as { elements?: OverpassElement[] };
    const elements = body.elements ?? [];

    const matches: SensitiveSiteMatchResult[] = [];
    for (const element of elements) {
      const tags = element.tags ?? {};
      const category = mapOsmTagsToCategory(tags);
      if (!category) continue;

      const elementLat = element.lat ?? element.center?.lat;
      const elementLng = element.lon ?? element.center?.lon;
      const distanceMeters =
        elementLat !== undefined && elementLng !== undefined
          ? haversineMeters(point, { lat: elementLat, lng: elementLng })
          : null;

      matches.push({
        source: SensitiveSiteMatchSource.osm_overpass,
        category,
        distanceMeters,
        detail: tags.amenity ?? tags.landuse ?? tags.military ?? tags.diplomatic ?? "",
      });
    }

    return { matches, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Overpass error";
    return { matches: [], error: message };
  }
}

export async function checkSensitiveSite(point: Point): Promise<SensitiveSiteCheckResult> {
  const [manualMatches, osmResult] = await Promise.all([
    checkManualZones(point),
    checkOsmOverpass(point),
  ]);

  const checkErrors: SensitiveSiteCheckError[] = osmResult.error
    ? [{ source: SensitiveSiteMatchSource.check_error, message: osmResult.error }]
    : [];

  return {
    matches: [...manualMatches, ...osmResult.matches],
    checkErrors,
  };
}
