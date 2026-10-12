import { describe, it, expect } from "vitest";
import { groupLandingMarkers, project, LANDING_MARKER_CELL } from "./landing-map";

describe("groupLandingMarkers", () => {
  it("merges cameras that land in the same cell into one marker at their average position", () => {
    const markers = groupLandingMarkers([
      { lat: -35.3, lng: 149.1 },
      { lat: -35.3001, lng: 149.1001 },
      { lat: -35.3002, lng: 149.1002 },
    ]);
    const [x, y] = project(149.1001, -35.3001);

    expect(markers).toHaveLength(1);
    expect(markers[0]!.count).toBe(3);
    expect(markers[0]!.x).toBeCloseTo(x, 3);
    expect(markers[0]!.y).toBeCloseTo(y, 3);
  });

  it("keeps cameras in different cities as separate markers", () => {
    const markers = groupLandingMarkers([
      { lat: -35.28, lng: 149.13 },
      { lat: -37.81, lng: 144.96 },
      { lat: -31.95, lng: 115.86 },
    ]);
    expect(markers).toHaveLength(3);
    expect(markers.every((m) => m.count === 1)).toBe(true);
  });

  it("keeps every merged marker inside a single cell", () => {
    const points = Array.from({ length: 200 }, (_, i) => ({ lat: -35.2 - (i % 20) * 0.01, lng: 149.0 + i * 0.002 }));
    const markers = groupLandingMarkers(points);

    expect(markers.reduce((sum, m) => sum + m.count, 0)).toBe(points.length);
    const cells = new Set(
      markers.map((m) => `${Math.floor(m.x / LANDING_MARKER_CELL)},${Math.floor(m.y / LANDING_MARKER_CELL)}`)
    );
    expect(cells.size).toBe(markers.length);
  });

  it("returns no markers when there are no cameras", () => {
    expect(groupLandingMarkers([])).toEqual([]);
  });
});
