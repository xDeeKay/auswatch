import { describe, it, expect } from "vitest";
import { haversineMeters, computeBoundingBox, distanceToBoundsMeters } from "./geo";

describe("haversineMeters", () => {
  it("returns 0 for the same point", () => {
    const point = { lat: -31.9505, lng: 115.8605 };
    expect(haversineMeters(point, point)).toBeCloseTo(0, 6);
  });

  it("is order-independent", () => {
    const a = { lat: -31.9505, lng: 115.8605 };
    const b = { lat: -32.0569, lng: 115.7439 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("matches a known distance (Perth to Fremantle, ~19km)", () => {
    const perth = { lat: -31.9505, lng: 115.8605 };
    const fremantle = { lat: -32.0569, lng: 115.7439 };
    const distanceKm = haversineMeters(perth, fremantle) / 1000;
    expect(distanceKm).toBeGreaterThan(14);
    expect(distanceKm).toBeLessThan(20);
  });

  it("scales roughly linearly for small offsets along a meridian", () => {
    const base = { lat: 0, lng: 0 };
    const oneDegree = haversineMeters(base, { lat: 1, lng: 0 });
    const twoDegrees = haversineMeters(base, { lat: 2, lng: 0 });
    expect(twoDegrees / oneDegree).toBeCloseTo(2, 1);
  });
});

describe("computeBoundingBox", () => {
  it("throws on an empty point list rather than returning a degenerate box", () => {
    expect(() => computeBoundingBox([], 1000)).toThrow();
  });

  it("encloses every input point, padded by the buffer", () => {
    const points = [
      { lat: -35.31, lng: 149.1 },
      { lat: -35.25, lng: 149.14 },
      { lat: -35.4, lng: 149.05 },
    ];
    const box = computeBoundingBox(points, 500);

    for (const point of points) {
      expect(point.lat).toBeGreaterThanOrEqual(box.south);
      expect(point.lat).toBeLessThanOrEqual(box.north);
      expect(point.lng).toBeGreaterThanOrEqual(box.west);
      expect(point.lng).toBeLessThanOrEqual(box.east);
    }

    expect(box.south).toBeLessThan(-35.4);
    expect(box.north).toBeGreaterThan(-35.25);
  });

  it("collapses to a single padded point for one input", () => {
    const box = computeBoundingBox([{ lat: -35.3, lng: 149.1 }], 1000);
    expect(box.south).toBeLessThan(-35.3);
    expect(box.north).toBeGreaterThan(-35.3);
    expect(box.west).toBeLessThan(149.1);
    expect(box.east).toBeGreaterThan(149.1);

    const latSpanMeters = (box.north - box.south) * 111320;
    expect(latSpanMeters).toBeGreaterThan(1900);
    expect(latSpanMeters).toBeLessThan(2100);
  });
});

describe("distanceToBoundsMeters", () => {
  const bounds = { minLat: -35.31, minLng: 149.1, maxLat: -35.29, maxLng: 149.12 };

  it("is 0 for a point inside the bounds", () => {
    expect(distanceToBoundsMeters({ lat: -35.3, lng: 149.11 }, bounds)).toBe(0);
  });

  it("is 0 for a point on the edge", () => {
    expect(distanceToBoundsMeters({ lat: -35.29, lng: 149.11 }, bounds)).toBe(0);
  });

  it("measures straight to the nearest edge when the point is beside the box", () => {
    const point = { lat: -35.3, lng: 149.1 - 0.001 };
    const expected = haversineMeters(point, { lat: -35.3, lng: 149.1 });
    expect(distanceToBoundsMeters(point, bounds)).toBeCloseTo(expected, 6);
  });

  it("measures to the nearest corner when the point is diagonal to the box", () => {
    const point = { lat: -35.29 + 0.001, lng: 149.12 + 0.001 };
    const expected = haversineMeters(point, { lat: -35.29, lng: 149.12 });
    expect(distanceToBoundsMeters(point, bounds)).toBeCloseTo(expected, 6);
  });

  it("reduces to a plain point distance for a zero-area box", () => {
    const site = { lat: -35.3, lng: 149.1 };
    const point = { lat: -35.301, lng: 149.1 };
    const box = { minLat: site.lat, minLng: site.lng, maxLat: site.lat, maxLng: site.lng };
    expect(distanceToBoundsMeters(point, box)).toBeCloseTo(haversineMeters(point, site), 6);
  });
});
