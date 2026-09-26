import { describe, expect, it } from "vitest";
import { AUSTRALIA_BOUNDS, CAPITAL_CITIES, REGIONAL_CITIES } from "./map-constants";

const [[south, west], [north, east]] = AUSTRALIA_BOUNDS;
const all = [...CAPITAL_CITIES, ...REGIONAL_CITIES];

describe("city label lists", () => {
  it("places every city inside Australia's bounds", () => {
    for (const city of all) {
      expect(city.lat, city.name).toBeGreaterThan(south);
      expect(city.lat, city.name).toBeLessThan(north);
      expect(city.lng, city.name).toBeGreaterThan(west);
      expect(city.lng, city.name).toBeLessThan(east);
    }
  });

  it("has no duplicate names, so a city is never drawn twice", () => {
    const names = all.map((city) => city.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("lists all eight state and territory capitals", () => {
    expect(CAPITAL_CITIES).toHaveLength(8);
  });

  it("uses only the two defined tiers, with some cities in each", () => {
    expect(REGIONAL_CITIES.every((city) => city.tier === 1 || city.tier === 2)).toBe(true);
    expect(REGIONAL_CITIES.some((city) => city.tier === 1)).toBe(true);
    expect(REGIONAL_CITIES.some((city) => city.tier === 2)).toBe(true);
  });
});
