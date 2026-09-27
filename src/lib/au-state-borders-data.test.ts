import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AUSTRALIA_BOUNDS } from "./map-constants";

type Border = { properties: { a: string; b: string }; geometry: { coordinates: [number, number][] } };

const file = path.join(process.cwd(), "public", "au-state-borders.geojson");
const borders = (JSON.parse(fs.readFileSync(file, "utf8")) as { features: Border[] }).features;

function lengthKm([...points]: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const lat = points[i][1];
    const dx = (points[i + 1][0] - points[i][0]) * 111.32 * Math.cos((lat * Math.PI) / 180);
    const dy = (points[i + 1][1] - points[i][1]) * 110.54;
    total += Math.hypot(dx, dy);
  }
  return total;
}

describe("public/au-state-borders.geojson", () => {
  it("has exactly the ten borders between neighbouring states and territories", () => {
    const pairs = borders.map(({ properties }) => `${properties.a}/${properties.b}`).sort();
    expect(pairs).toEqual([
      "act/nsw",
      "nsw/qld",
      "nsw/sa",
      "nsw/vic",
      "nt/qld",
      "nt/sa",
      "nt/wa",
      "qld/sa",
      "sa/vic",
      "sa/wa",
    ]);
  });

  it("keeps every point inside Australia's bounds", () => {
    const [[south, west], [north, east]] = AUSTRALIA_BOUNDS;
    for (const border of borders) {
      for (const [lng, lat] of border.geometry.coordinates) {
        expect(lat).toBeGreaterThan(south);
        expect(lat).toBeLessThan(north);
        expect(lng).toBeGreaterThan(west);
        expect(lng).toBeLessThan(east);
      }
    }
  });

  it("gives each long border about its real length, so no stretch has been lost", () => {
    const expectedKm: Record<string, number> = {
      "nt/wa": 1229,
      "nt/sa": 900,
      "sa/wa": 629,
      "nsw/sa": 555,
      "nt/qld": 1046,
      "qld/sa": 632,
    };
    for (const border of borders) {
      const key = `${border.properties.a}/${border.properties.b}`;
      const expected = expectedKm[key];
      if (expected) expect(lengthKm(border.geometry.coordinates), key).toBeGreaterThan(expected * 0.97);
    }
  });

  it("has no run shorter than the minimum length", () => {
    for (const border of borders) {
      expect(lengthKm(border.geometry.coordinates), `${border.properties.a}/${border.properties.b}`).toBeGreaterThan(2);
    }
  });
});
