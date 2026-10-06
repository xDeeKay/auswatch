import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SensitiveZoneCategory, SensitiveSiteMatchSource } from "@/generated/prisma/enums";
import { haversineMeters } from "./geo";

const findManyMock = vi.fn();
const cacheFindFirstMock = vi.fn();
const cacheFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    sensitiveZone: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
    sensitiveSiteOsmCache: {
      findFirst: (...args: unknown[]) => cacheFindFirstMock(...args),
      findMany: (...args: unknown[]) => cacheFindManyMock(...args),
    },
  },
}));

const { matchZones, mapOsmTagsToCategory, matchOsmFeatures, checkSensitiveSite, getOsmRadiiMeters, fetchOsmFeaturesInBbox } = await import(
  "./sensitive-site-check"
);

const RADII = { school: 100, embassy: 100, military: 100, correctional: 100 };

function stubRadiiEnv(radii = { school: 100, embassy: 200, military: 300, correctional: 400 }) {
  vi.stubEnv("OSM_SENSITIVE_SITE_RADIUS_METERS_SCHOOL", String(radii.school));
  vi.stubEnv("OSM_SENSITIVE_SITE_RADIUS_METERS_EMBASSY", String(radii.embassy));
  vi.stubEnv("OSM_SENSITIVE_SITE_RADIUS_METERS_MILITARY", String(radii.military));
  vi.stubEnv("OSM_SENSITIVE_SITE_RADIUS_METERS_CORRECTIONAL", String(radii.correctional));
}

describe("matchZones", () => {
  const point = { lat: -31.9505, lng: 115.8605 };

  it("matches a zone the point falls inside", () => {
    const zones = [
      { id: "z1", category: SensitiveZoneCategory.school, lat: -31.9505, lng: 115.8605, radiusMeters: 100 },
    ];
    const matches = matchZones(point, zones);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      source: SensitiveSiteMatchSource.manual_zone,
      category: SensitiveZoneCategory.school,
      zoneId: "z1",
      lat: -31.9505,
      lng: 115.8605,
    });
  });

  it("does not match a zone the point falls outside", () => {
    const zones = [
      { id: "z1", category: SensitiveZoneCategory.school, lat: -33.8688, lng: 151.2093, radiusMeters: 100 },
    ];
    expect(matchZones(point, zones)).toHaveLength(0);
  });

  it("matches when the radius exactly equals the distance to the zone center", () => {
    const zoneCenter = { lat: -32.0569, lng: 115.7439 };
    const distance = haversineMeters(point, zoneCenter);
    const zones = [
      {
        id: "z1",
        category: SensitiveZoneCategory.dv_shelter,
        lat: zoneCenter.lat,
        lng: zoneCenter.lng,
        radiusMeters: distance,
      },
    ];
    expect(matchZones(point, zones)).toHaveLength(1);
  });

  it("does not match when the radius is just short of the distance to the zone center", () => {
    const zoneCenter = { lat: -32.0569, lng: 115.7439 };
    const distance = haversineMeters(point, zoneCenter);
    const zones = [
      {
        id: "z1",
        category: SensitiveZoneCategory.dv_shelter,
        lat: zoneCenter.lat,
        lng: zoneCenter.lng,
        radiusMeters: distance - 1,
      },
    ];
    expect(matchZones(point, zones)).toHaveLength(0);
  });

  it("returns multiple matches when several zones overlap the point", () => {
    const zones = [
      { id: "z1", category: SensitiveZoneCategory.school, lat: -31.9505, lng: 115.8605, radiusMeters: 50 },
      { id: "z2", category: SensitiveZoneCategory.military, lat: -31.9505, lng: 115.8605, radiusMeters: 50 },
      { id: "z3", category: SensitiveZoneCategory.embassy, lat: -33.8688, lng: 151.2093, radiusMeters: 50 },
    ];
    expect(matchZones(point, zones)).toHaveLength(2);
  });

  it("returns no matches for an empty zone list", () => {
    expect(matchZones(point, [])).toHaveLength(0);
  });
});

describe("matchOsmFeatures", () => {
  const point = { lat: -31.9505, lng: 115.8605 };

  it("matches a feature within the radius and reports its distance", () => {
    const features = [
      { lat: -31.9505, lng: 115.8605, category: SensitiveZoneCategory.school, detail: "school" },
    ];
    const matches = matchOsmFeatures(point, features, RADII);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      source: SensitiveSiteMatchSource.osm_overpass,
      category: SensitiveZoneCategory.school,
      detail: "school",
      lat: -31.9505,
      lng: 115.8605,
    });
  });

  it("excludes a feature outside the radius", () => {
    const features = [
      { lat: -33.8688, lng: 151.2093, category: SensitiveZoneCategory.school, detail: "school" },
    ];
    expect(matchOsmFeatures(point, features, RADII)).toHaveLength(0);
  });

  it("checks each feature against the same radius independently, unlike a single-query bbox fetch", () => {
    const near = { lat: -31.9505, lng: 115.8605, category: SensitiveZoneCategory.military, detail: "base" };
    const far = { lat: -33.8688, lng: 151.2093, category: SensitiveZoneCategory.embassy, detail: "embassy" };
    const matches = matchOsmFeatures(point, [near, far], RADII);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.category).toBe(SensitiveZoneCategory.military);
  });
});

describe("matchOsmFeatures per-category radius and site extent", () => {
  const point = { lat: -35.3, lng: 149.1 };
  // About 0.0009 degrees of latitude is roughly 100 m.
  const northBy = (meters: number) => ({ lat: point.lat + meters / 111_195, lng: point.lng });

  it("applies each category's own radius to a point site", () => {
    const radii = { school: 100, embassy: 300, military: 500, correctional: 500 };
    const at200 = northBy(200);
    const school = { ...at200, category: SensitiveZoneCategory.school, detail: "school" };
    const embassy = { ...at200, category: SensitiveZoneCategory.embassy, detail: "embassy" };

    expect(matchOsmFeatures(point, [school], radii)).toHaveLength(0);
    expect(matchOsmFeatures(point, [embassy], radii)).toHaveLength(1);
  });

  it("measures to the edge of a large site, not its centre", () => {
    const radii = { school: 100, embassy: 100, military: 100, correctional: 100 };
    const centre = northBy(2000);
    const base = {
      ...centre,
      category: SensitiveZoneCategory.military,
      detail: "base",
      bounds: { minLat: point.lat + 50 / 111_195, minLng: point.lng - 0.02, maxLat: point.lat + 4000 / 111_195, maxLng: point.lng + 0.02 },
    };

    const matches = matchOsmFeatures(point, [base], radii);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.distanceMeters).toBeGreaterThan(40);
    expect(matches[0]!.distanceMeters).toBeLessThan(60);
  });

  it("reports distance 0 for a point inside a site's extent", () => {
    const radii = { school: 100, embassy: 100, military: 100, correctional: 100 };
    const base = {
      ...point,
      category: SensitiveZoneCategory.military,
      detail: "base",
      bounds: { minLat: point.lat - 0.01, minLng: point.lng - 0.01, maxLat: point.lat + 0.01, maxLng: point.lng + 0.01 },
    };

    expect(matchOsmFeatures(point, [base], radii)[0]!.distanceMeters).toBe(0);
  });

  it("falls back to the widest radius for a category the radii do not name", () => {
    const radii = { school: 50, embassy: 50, military: 500, correctional: 50 };
    const feature = { ...northBy(300), category: SensitiveZoneCategory.dv_shelter, detail: "" };

    expect(matchOsmFeatures(point, [feature], radii)).toHaveLength(1);
  });
});

describe("fetchOsmFeaturesInBbox", () => {
  const bbox = { south: -36, west: 148, north: -35, east: 150 };

  function mockOverpass(body: unknown) {
    vi.stubEnv("OVERPASS_TIMEOUT_MS", "1000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }));
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps a way that has bounds but no centre, centred on its bounds", async () => {
    mockOverpass({
      elements: [
        {
          type: "way",
          bounds: { minlat: -35.4, minlon: 149.0, maxlat: -35.2, maxlon: 149.2 },
          tags: { landuse: "military" },
        },
      ],
    });

    const features = await fetchOsmFeaturesInBbox(bbox);

    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      category: SensitiveZoneCategory.military,
      bounds: { minLat: -35.4, minLng: 149.0, maxLat: -35.2, maxLng: 149.2 },
    });
    expect(features[0]!.lat).toBeCloseTo(-35.3, 6);
    expect(features[0]!.lng).toBeCloseTo(149.1, 6);
  });

  it("gives a node a zero-area extent at its own position", async () => {
    mockOverpass({ elements: [{ type: "node", lat: -35.3, lon: 149.1, tags: { amenity: "school" } }] });

    const features = await fetchOsmFeaturesInBbox(bbox);

    expect(features[0]).toMatchObject({
      lat: -35.3,
      lng: 149.1,
      bounds: { minLat: -35.3, minLng: 149.1, maxLat: -35.3, maxLng: 149.1 },
    });
  });

  it("still reads a way that carries a centre", async () => {
    mockOverpass({ elements: [{ type: "way", center: { lat: -35.3, lon: 149.1 }, tags: { amenity: "embassy" } }] });

    const features = await fetchOsmFeaturesInBbox(bbox);

    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({ lat: -35.3, lng: 149.1, category: SensitiveZoneCategory.embassy });
  });

  it("skips an element with no usable position", async () => {
    mockOverpass({ elements: [{ type: "way", tags: { amenity: "school" } }] });

    expect(await fetchOsmFeaturesInBbox(bbox)).toHaveLength(0);
  });

  it("rejects a partial result flagged by an Overpass runtime error", async () => {
    mockOverpass({
      remark: "runtime error: Query ran out of memory",
      elements: [{ type: "node", lat: -35.3, lon: 149.1, tags: { amenity: "school" } }],
    });

    await expect(fetchOsmFeaturesInBbox(bbox)).rejects.toThrow(/partial result/);
  });
});

describe("getOsmRadiiMeters", () => {
  it("reads one radius per category from the environment", () => {
    stubRadiiEnv({ school: 11, embassy: 22, military: 33, correctional: 44 });
    expect(getOsmRadiiMeters()).toEqual({ school: 11, embassy: 22, military: 33, correctional: 44 });
    vi.unstubAllEnvs();
  });

  it("throws rather than defaulting when a radius is missing", () => {
    stubRadiiEnv();
    vi.stubEnv("OSM_SENSITIVE_SITE_RADIUS_METERS_EMBASSY", "");
    expect(() => getOsmRadiiMeters()).toThrow(/OSM_SENSITIVE_SITE_RADIUS_METERS_EMBASSY/);
    vi.unstubAllEnvs();
  });
});

describe("mapOsmTagsToCategory", () => {
  it("maps amenity=school to school", () => {
    expect(mapOsmTagsToCategory({ amenity: "school" })).toBe(SensitiveZoneCategory.school);
  });

  it("maps landuse=military to military", () => {
    expect(mapOsmTagsToCategory({ landuse: "military" })).toBe(SensitiveZoneCategory.military);
  });

  it("maps a bare military tag to military", () => {
    expect(mapOsmTagsToCategory({ military: "base" })).toBe(SensitiveZoneCategory.military);
  });

  it("maps amenity=embassy to embassy", () => {
    expect(mapOsmTagsToCategory({ amenity: "embassy" })).toBe(SensitiveZoneCategory.embassy);
  });

  it("maps amenity=prison to correctional", () => {
    expect(mapOsmTagsToCategory({ amenity: "prison" })).toBe(SensitiveZoneCategory.correctional);
  });

  it("returns null for unrelated tags", () => {
    expect(mapOsmTagsToCategory({ shop: "supermarket" })).toBeNull();
  });

  it("returns null for an empty tag set", () => {
    expect(mapOsmTagsToCategory({})).toBeNull();
  });
});

describe("checkSensitiveSite", () => {
  const point = { lat: -31.9505, lng: 115.8605 };
  const maxAgeHours = Number(process.env.OSM_SENSITIVE_SITE_CACHE_MAX_AGE_HOURS);

  function mockCache(newest: unknown, withoutExtent: unknown = null) {
    cacheFindFirstMock.mockImplementation((args: { where?: Record<string, unknown> }) =>
      Promise.resolve(args?.where && "minLat" in args.where ? withoutExtent : newest)
    );
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    stubRadiiEnv();
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([]);
    cacheFindFirstMock.mockReset();
    cacheFindManyMock.mockReset();
    cacheFindManyMock.mockResolvedValue([]);
  });

  it("records a check_error and never throws when the cache has not been populated yet, while manual-zone matches still come through", async () => {
    findManyMock.mockResolvedValue([
      { id: "z1", category: SensitiveZoneCategory.school, lat: point.lat, lng: point.lng, radiusMeters: 100 },
    ]);
    mockCache(null);

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(1);
    expect(result.checkErrors[0]!.source).toBe(SensitiveSiteMatchSource.check_error);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.source).toBe(SensitiveSiteMatchSource.manual_zone);
  });

  it("records a check_error when the cache is older than the configured max age", async () => {
    const tooOld = new Date(Date.now() - (maxAgeHours + 1) * 60 * 60 * 1000);
    mockCache({ refreshedAt: tooOld });

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(1);
    expect(result.checkErrors[0]!.message).toMatch(/stale/i);
    expect(result.matches).toHaveLength(0);
  });

  it("returns no matches and no errors when the cache is fresh and nothing is nearby", async () => {
    mockCache({ refreshedAt: new Date() });
    cacheFindManyMock.mockResolvedValue([]);

    const result = await checkSensitiveSite(point);

    expect(result.matches).toHaveLength(0);
    expect(result.checkErrors).toHaveLength(0);
  });

  it("matches a nearby cached feature when the cache is fresh", async () => {
    mockCache({ refreshedAt: new Date() });
    cacheFindManyMock.mockResolvedValue([
      {
        lat: point.lat,
        lng: point.lng,
        minLat: point.lat,
        minLng: point.lng,
        maxLat: point.lat,
        maxLng: point.lng,
        category: SensitiveZoneCategory.school,
        detail: "school",
      },
    ]);

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(0);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.source).toBe(SensitiveSiteMatchSource.osm_overpass);
  });

  it("records a check_error when any cached row predates stored site extents", async () => {
    mockCache({ refreshedAt: new Date() }, { id: "legacy-row" });

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(1);
    expect(result.checkErrors[0]!.message).toMatch(/refresh/i);
    expect(result.matches).toHaveLength(0);
    expect(cacheFindManyMock).not.toHaveBeenCalled();
  });

  it("selects cached sites whose extent overlaps the widest radius around the point", async () => {
    mockCache({ refreshedAt: new Date() });

    await checkSensitiveSite(point);

    const where = cacheFindManyMock.mock.calls[0]![0].where as Record<string, Record<string, number>>;
    const widestMeters = 400;
    const latPadding = widestMeters / 111_195;
    expect(where.minLat!.lte).toBeCloseTo(point.lat + latPadding, 4);
    expect(where.maxLat!.gte).toBeCloseTo(point.lat - latPadding, 4);
    expect(where.minLng!.lte).toBeGreaterThan(point.lng);
    expect(where.maxLng!.gte).toBeLessThan(point.lng);
  });

  it("matches a large cached site whose centre is far away but whose edge is near", async () => {
    mockCache({ refreshedAt: new Date() });
    cacheFindManyMock.mockResolvedValue([
      {
        lat: point.lat + 0.02,
        lng: point.lng,
        minLat: point.lat + 0.0002,
        minLng: point.lng - 0.02,
        maxLat: point.lat + 0.04,
        maxLng: point.lng + 0.02,
        category: SensitiveZoneCategory.military,
        detail: "base",
      },
    ]);

    const result = await checkSensitiveSite(point);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.category).toBe(SensitiveZoneCategory.military);
    expect(result.matches[0]!.distanceMeters).toBeLessThan(100);
  });
});
