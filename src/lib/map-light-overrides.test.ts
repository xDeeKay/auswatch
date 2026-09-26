import { describe, expect, it } from "vitest";
import { DARK_MATTER_OVERRIDES } from "./map-constants";
import { LIGHT_MAP_OVERRIDES } from "./map-light-overrides";

describe("LIGHT_MAP_OVERRIDES", () => {
  it("covers exactly the layers and properties the dark map overrides", () => {
    expect(Object.keys(LIGHT_MAP_OVERRIDES)).toEqual(Object.keys(DARK_MATTER_OVERRIDES));
    for (const [layerId, paint] of Object.entries(DARK_MATTER_OVERRIDES)) {
      expect(Object.keys(LIGHT_MAP_OVERRIDES[layerId])).toEqual(Object.keys(paint));
    }
  });

  it("translates every dark colour, so none is left unmapped", () => {
    for (const [layerId, paint] of Object.entries(DARK_MATTER_OVERRIDES)) {
      for (const [prop, value] of Object.entries(paint)) {
        if (typeof value === "number") continue;
        expect(LIGHT_MAP_OVERRIDES[layerId][prop], `${layerId}.${prop}`).not.toBe(value);
      }
    }
  });

  it("keeps numeric values such as opacity unchanged", () => {
    expect(LIGHT_MAP_OVERRIDES.landcover["fill-opacity"]).toBe(1);
  });

  it("draws label text dark and more opaque than the dark map's light text", () => {
    expect(DARK_MATTER_OVERRIDES.place_city_r5["text-color"]).toBe("rgba(233, 228, 216, 0.7)");
    expect(LIGHT_MAP_OVERRIDES.place_city_r5["text-color"]).toBe("rgba(26, 33, 39, 0.79)");
  });

  it("swaps the near-black label halos for the light surface tone", () => {
    expect(LIGHT_MAP_OVERRIDES.place_town["text-halo-color"]).toBe("#f4f1ea");
  });
});
