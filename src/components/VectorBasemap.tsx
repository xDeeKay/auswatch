"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { useMap } from "react-leaflet";
import {
  CAPITAL_CITY_NAMES,
  CARTO_ATTRIBUTION,
  CARTO_DARK_MATTER_STYLE_URL,
  CARTO_LIGHT_RASTER_URL,
  CARTO_LIGHT_STYLE_URL,
  CARTO_RASTER_URL,
  DARK_MATTER_OVERRIDES,
  MIN_ZOOM,
  SUBURB_LABEL_MIN_ZOOM,
  WATER_COLOR,
} from "@/lib/map-constants";
import { LIGHT_MAP_OVERRIDES, LIGHT_WATER_COLOR } from "@/lib/map-light-overrides";
import { buildAustraliaMask } from "@/lib/australia-mask";
import type { ResolvedTheme } from "@/lib/theme";
import { useResolvedTheme } from "./useResolvedTheme";

type StyleLayer = {
  id: string;
  type?: string;
  source?: string;
  "source-layer"?: string;
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};
type Style = { layers: StyleLayer[]; sources: Record<string, unknown> };

// Shares its filter's name list with CAPITAL_CITY_NAMES rather than any of
// CARTO's own rank-based place tiers - see the comment on that constant for
// why rank isn't a safe proxy for "state/territory capital" here. Handing off
// to place_city_r5/r6 at maxzoom 8 (their own minzoom) avoids drawing the
// same city twice once the stock style's own tiers take over.
const CAPITAL_CITY_LAYER: StyleLayer = {
  id: "au-capital-city-labels",
  type: "symbol",
  source: "carto",
  "source-layer": "place",
  minzoom: MIN_ZOOM,
  maxzoom: 8,
  filter: ["all", ["==", "class", "city"], ["in", "name_en", ...CAPITAL_CITY_NAMES]],
  layout: {
    "text-field": "{name_en}",
    "text-font": ["Montserrat Medium", "Open Sans Bold", "Noto Sans Regular", "HanWangHeiLight Regular", "NanumBarunGothic Regular"],
    "text-size": 12,
    "icon-image": "circle-11",
    "icon-offset": [16, 5],
    "text-anchor": "right",
    "icon-size": 0.4,
    "text-max-width": 8,
    "text-keep-upright": true,
    "text-offset": [0.2, 0.2],
  },
};

type MapThemeConfig = {
  styleUrl: string;
  rasterUrl: string;
  overrides: Record<string, Record<string, string | number>>;
  waterColor: string;
  capitalPaint: Record<string, string | number>;
};

const MAP_THEMES: Record<ResolvedTheme, MapThemeConfig> = {
  dark: {
    styleUrl: CARTO_DARK_MATTER_STYLE_URL,
    rasterUrl: CARTO_RASTER_URL,
    overrides: DARK_MATTER_OVERRIDES,
    waterColor: WATER_COLOR,
    capitalPaint: {
      "text-color": "rgba(233, 228, 216, 0.85)",
      "icon-color": "rgba(217, 164, 65, 0.9)",
      "text-halo-color": "#0a0d11",
      "text-halo-width": 1,
    },
  },
  light: {
    styleUrl: CARTO_LIGHT_STYLE_URL,
    rasterUrl: CARTO_LIGHT_RASTER_URL,
    overrides: LIGHT_MAP_OVERRIDES,
    waterColor: LIGHT_WATER_COLOR,
    capitalPaint: {
      "text-color": "rgba(26, 33, 39, 0.9)",
      "icon-color": "rgba(143, 98, 18, 0.95)",
      "text-halo-color": "#f4f1ea",
      "text-halo-width": 1,
    },
  },
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

// Starts a label layer earlier by lowering its minzoom and extending its
// size ramp back to that zoom at the size it already has at its first stop, so
// the labels don't appear at an unset size.
function startLabelsAt(layer: StyleLayer, minZoom: number): void {
  layer.minzoom = minZoom;
  const size = layer.layout?.["text-size"] as { stops?: [number, number][] } | undefined;
  const first = size?.stops?.[0];
  if (size?.stops && first && first[0] > minZoom) size.stops.unshift([minZoom, first[1]]);
}

async function fetchStyle(theme: ResolvedTheme): Promise<Style> {
  const config = MAP_THEMES[theme];
  const response = await fetch(config.styleUrl);
  if (!response.ok) throw new Error(`CARTO style fetch returned ${response.status}`);
  const style = (await response.json()) as Style;
  for (const layer of style.layers) {
    const override = config.overrides[layer.id];
    if (override && layer.paint) Object.assign(layer.paint, override);
    if (layer.id === "place_suburbs") startLabelsAt(layer, SUBURB_LABEL_MIN_ZOOM);
  }
  style.layers.push({ ...CAPITAL_CITY_LAYER, paint: config.capitalPaint });

  // Painted last (on top of every other layer, including neighbouring
  // countries' place labels and roads) rather than filtering each of the
  // style's ~90 layers individually - see buildAustraliaMask().
  style.sources["au-mask"] = { type: "geojson", data: buildAustraliaMask() };
  style.layers.push({
    id: "au-mask-fill",
    type: "fill",
    source: "au-mask",
    paint: { "fill-color": config.waterColor, "fill-opacity": 1 },
  });

  return style;
}

// Each theme's style is fetched once and reused when the theme is switched
// back. Callers get a copy because MapLibre takes ownership of what it is
// given.
const styleCache = new Map<ResolvedTheme, Promise<Style>>();

async function loadStyle(theme: ResolvedTheme): Promise<Style> {
  let cached = styleCache.get(theme);
  if (!cached) {
    cached = fetchStyle(theme);
    styleCache.set(theme, cached);
    cached.catch(() => styleCache.delete(theme));
  }
  return structuredClone(await cached);
}

type BasemapState =
  | { kind: "gl"; layer: ReturnType<typeof L.maplibreGL>; theme: ResolvedTheme; removed: boolean }
  | { kind: "raster"; layer: L.TileLayer; theme: ResolvedTheme; removed: boolean };

function applyTheme(state: BasemapState, theme: ResolvedTheme): void {
  if (state.theme === theme) return;
  state.theme = theme;

  if (state.kind === "raster") {
    state.layer.setUrl(MAP_THEMES[theme].rasterUrl);
    return;
  }

  loadStyle(theme)
    .then((style) => {
      if (state.removed || state.theme !== theme) return;
      state.layer.getMaplibreMap().setStyle(style as never);
    })
    .catch((error) => console.error("Basemap style change failed:", error));
}

// A WebGL context can fail to create at all (blocklisted GPU driver, remote
// desktop, hardware acceleration disabled), and L.maplibreGL's onAdd throws
// partway through in that case, leaving the layer half-registered with the
// map's resize/event system so every later invalidateSize() throws too.
// Checking hasWebGL() up front avoids ever reaching that broken state.
export function VectorBasemap({ onReady }: { onReady?: () => void } = {}) {
  const map = useMap();
  const theme = useResolvedTheme();
  const stateRef = useRef<BasemapState | null>(null);

  // Callers pass a fresh inline callback every render, and the theme can change
  // while the basemap is still loading. Listing either as a dependency of the
  // effect below would rebuild the whole basemap, so it reads the latest of
  // each through a ref instead.
  const onReadyRef = useRef(onReady);
  const themeRef = useRef(theme);
  useEffect(() => {
    onReadyRef.current = onReady;
    themeRef.current = theme;
  });

  useEffect(() => {
    let cancelled = false;

    function addRaster() {
      const initialTheme = themeRef.current;
      const layer = L.tileLayer(MAP_THEMES[initialTheme].rasterUrl, { attribution: CARTO_ATTRIBUTION, maxZoom: 19 });
      layer.once("load", () => onReadyRef.current?.());
      layer.addTo(map);
      stateRef.current = { kind: "raster", layer, theme: initialTheme, removed: false };
    }

    if (!hasWebGL()) {
      addRaster();
    } else {
      const initialTheme = themeRef.current;
      loadStyle(initialTheme)
        .then((style) => {
          if (cancelled) return;
          // Attribution comes from the vector source's own TileJSON at
          // runtime (the plugin's getAttribution() reads it off the loaded
          // maplibre source), not from an option passed in here.
          const layer = L.maplibreGL({ style: style as never });
          layer.addTo(map);
          const state: BasemapState = { kind: "gl", layer, theme: initialTheme, removed: false };
          stateRef.current = state;
          layer.getMaplibreMap().once("load", () => onReadyRef.current?.());
          applyTheme(state, themeRef.current);
        })
        .catch((error) => {
          console.error("Vector basemap failed to load, falling back to raster tiles:", error);
          if (!cancelled) addRaster();
        });
    }

    return () => {
      cancelled = true;
      const state = stateRef.current;
      if (state) {
        state.removed = true;
        map.removeLayer(state.layer);
        stateRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (stateRef.current) applyTheme(stateRef.current, theme);
  }, [theme]);

  return null;
}
