import { describe, expect, it } from "vitest";
import { IMAGERY_LAYER_ID, IMAGERY_SOURCE_ID, applySatelliteStyle } from "./satellite-style";

const REGION = { type: "Polygon", coordinates: [[[100, -47], [157, -47], [157, -10], [100, -10], [100, -47]]] };

function makeStyle() {
  return {
    sources: { carto: { type: "vector" } } as Record<string, unknown>,
    layers: [
      { id: "background", type: "background", paint: {} },
      { id: "water", type: "fill", paint: {} },
      { id: "road_minor_fill", type: "line", paint: {} },
      { id: "boundary_county", type: "line", paint: {} },
      { id: "boundary_country_outline", type: "line", paint: {} },
      { id: "boundary_state", type: "line", paint: { "line-color": "rgba(233, 228, 216, 0.3)" } },
      {
        id: "place_town",
        type: "symbol",
        filter: ["all", ["==", "class", "town"], ["has", "name"]],
        paint: { "text-color": "rgba(233, 228, 216, 0.6)", "text-halo-color": "#0a0d11" },
      },
    ] as { id: string; type: string; filter?: unknown[]; paint: Record<string, unknown>; layout?: Record<string, unknown> }[],
  };
}

describe("applySatelliteStyle", () => {
  it("adds the imagery source and puts its layer at the bottom", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "https://tiles.example/{z}/{y}/{x}?token=k", REGION);
    expect(style.sources[IMAGERY_SOURCE_ID]).toMatchObject({ type: "raster", tileSize: 256 });
    expect(style.layers[0].id).toBe(IMAGERY_LAYER_ID);
  });

  it("hides land, water, road, county and country fills and lines", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "u", REGION);
    for (const id of ["background", "water", "road_minor_fill", "boundary_county", "boundary_country_outline"]) {
      expect(style.layers.find((l) => l.id === id)?.layout, id).toMatchObject({ visibility: "none" });
    }
  });

  it("keeps labels and the state line visible", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "u", REGION);
    for (const id of ["place_town", "boundary_state"]) {
      expect(style.layers.find((l) => l.id === id)?.layout?.visibility, id).toBeUndefined();
    }
  });

  it("brightens the state line and label text so they read on imagery", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "u", REGION);
    expect(style.layers.find((l) => l.id === "boundary_state")?.paint).toMatchObject({
      "line-color": "rgba(255, 255, 255, 0.85)",
      "line-width": 1.5,
    });
    expect(style.layers.find((l) => l.id === "place_town")?.paint).toMatchObject({
      "text-color": "rgba(233, 228, 216, 0.95)",
      "text-halo-width": 1.5,
    });
  });

  it("keeps only labels inside the region, converting legacy filters so they can be combined", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "u", REGION);
    expect(style.layers.find((l) => l.id === "place_town")?.filter).toEqual([
      "all",
      ["all", ["==", ["get", "class"], "town"], ["has", "name"]],
      ["within", REGION],
    ]);
  });

  it("keeps the state line whole, since its features mix Australian and foreign borders", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "u", REGION);
    expect(style.layers.find((l) => l.id === "boundary_state")?.filter).toBeUndefined();
  });

  it("restricts a label layer with no filter of its own to the region alone", () => {
    const style = makeStyle();
    style.layers.push({ id: "place_country_1", type: "symbol", paint: {} });
    applySatelliteStyle(style, "u", REGION);
    expect(style.layers.find((l) => l.id === "place_country_1")?.filter).toEqual(["within", REGION]);
  });

  it("leaves the hidden layers and the imagery layer unfiltered", () => {
    const style = makeStyle();
    applySatelliteStyle(style, "u", REGION);
    expect(style.layers.find((l) => l.id === "water")?.filter).toBeUndefined();
    expect(style.layers.find((l) => l.id === IMAGERY_LAYER_ID)?.filter).toBeUndefined();
  });
});
