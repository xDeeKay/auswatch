export type BasemapView = "map" | "satellite";

export const BASEMAP_VIEW_STORAGE_KEY = "auswatch-basemap";

export function parseBasemapView(value: unknown): BasemapView {
  return value === "satellite" ? "satellite" : "map";
}

export function toggleBasemapView(current: BasemapView): BasemapView {
  return current === "satellite" ? "map" : "satellite";
}
