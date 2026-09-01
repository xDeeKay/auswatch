import { describe, it, expect } from "vitest";
import { haversineMeters } from "./geo";

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
