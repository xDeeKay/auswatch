import { describe, it, expect, vi, beforeEach } from "vitest";
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

const { matchZones, mapOsmTagsToCategory, matchOsmFeatures, checkSensitiveSite } = await import("./sensitive-site-check");

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
    const matches = matchOsmFeatures(point, features, 100);
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
    expect(matchOsmFeatures(point, features, 100)).toHaveLength(0);
  });

  it("checks each feature against the same radius independently, unlike a single-query bbox fetch", () => {
    const near = { lat: -31.9505, lng: 115.8605, category: SensitiveZoneCategory.military, detail: "base" };
    const far = { lat: -33.8688, lng: 151.2093, category: SensitiveZoneCategory.embassy, detail: "embassy" };
    const matches = matchOsmFeatures(point, [near, far], 100);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.category).toBe(SensitiveZoneCategory.military);
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

  beforeEach(() => {
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
    cacheFindFirstMock.mockResolvedValue(null);

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(1);
    expect(result.checkErrors[0]!.source).toBe(SensitiveSiteMatchSource.check_error);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.source).toBe(SensitiveSiteMatchSource.manual_zone);
  });

  it("records a check_error when the cache is older than the configured max age", async () => {
    const tooOld = new Date(Date.now() - (maxAgeHours + 1) * 60 * 60 * 1000);
    cacheFindFirstMock.mockResolvedValue({ refreshedAt: tooOld });

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(1);
    expect(result.checkErrors[0]!.message).toMatch(/stale/i);
    expect(result.matches).toHaveLength(0);
  });

  it("returns no matches and no errors when the cache is fresh and nothing is nearby", async () => {
    cacheFindFirstMock.mockResolvedValue({ refreshedAt: new Date() });
    cacheFindManyMock.mockResolvedValue([]);

    const result = await checkSensitiveSite(point);

    expect(result.matches).toHaveLength(0);
    expect(result.checkErrors).toHaveLength(0);
  });

  it("matches a nearby cached feature when the cache is fresh", async () => {
    cacheFindFirstMock.mockResolvedValue({ refreshedAt: new Date() });
    cacheFindManyMock.mockResolvedValue([
      { lat: point.lat, lng: point.lng, category: SensitiveZoneCategory.school, detail: "school" },
    ]);

    const result = await checkSensitiveSite(point);

    expect(result.checkErrors).toHaveLength(0);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.source).toBe(SensitiveSiteMatchSource.osm_overpass);
  });
});
