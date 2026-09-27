import { restrictToRegion } from "./map-filter";

type Layer = {
  id: string;
  type?: string;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  [key: string]: unknown;
};

type Style = { layers: Layer[]; sources: Record<string, unknown> };

export const IMAGERY_SOURCE_ID = "esri-imagery";
export const IMAGERY_LAYER_ID = "esri-imagery-layer";

// Everything that is not a label is hidden under the imagery except the state
// line. Australia has no land border, so the country lines are all foreign.
const KEEP_VISIBLE = new Set(["boundary_state"]);

// The state line is drawn from our own Australia-only borders, so it needs no
// region test.
const NOT_REGION_FILTERED = new Set(["boundary_state"]);

const LIGHT_TEXT = /^rgba\(233, 228, 216, [\d.]+\)$/;
const BOUNDARY_ON_IMAGERY: Record<string, { color: string; width: number }> = {
  boundary_state: { color: "rgba(255, 255, 255, 0.85)", width: 1.5 },
};

// Turns a vector style into a hybrid: the imagery is drawn at the bottom, the
// land, water, road and building fills are hidden, and the labels and
// state line stay on top, restyled to read against photographs. Only labels
// inside `region` are kept, since there is no mask to hide the rest.
export function applySatelliteStyle(style: Style, imageryTileUrl: string, region: unknown): void {
  style.sources[IMAGERY_SOURCE_ID] = { type: "raster", tiles: [imageryTileUrl], tileSize: 256, maxzoom: 19 };

  for (const layer of style.layers) {
    if (layer.type !== "symbol" && !KEEP_VISIBLE.has(layer.id)) {
      layer.layout = { ...layer.layout, visibility: "none" };
      continue;
    }

    if (!NOT_REGION_FILTERED.has(layer.id)) layer.filter = restrictToRegion(layer.filter, region);

    const boundary = BOUNDARY_ON_IMAGERY[layer.id];
    if (boundary) {
      layer.paint = { ...layer.paint, "line-color": boundary.color, "line-width": boundary.width };
      continue;
    }

    const textColor = layer.paint?.["text-color"];
    if (typeof textColor === "string" && LIGHT_TEXT.test(textColor)) {
      layer.paint = { ...layer.paint, "text-color": "rgba(233, 228, 216, 0.95)", "text-halo-width": 1.5 };
    }
  }

  style.layers.unshift({ id: IMAGERY_LAYER_ID, type: "raster", source: IMAGERY_SOURCE_ID });
}
