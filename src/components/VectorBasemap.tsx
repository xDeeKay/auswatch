"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { config as maplibreConfig } from "maplibre-gl";
import "@maplibre/maplibre-gl-leaflet";
import { useMap } from "react-leaflet";
import {
  AU_STATE_BORDERS_ATTRIBUTION,
  AU_STATE_BORDERS_URL,
  CAPITAL_CITIES,
  CARTO_ATTRIBUTION,
  CARTO_DARK_MATTER_STYLE_URL,
  CARTO_LIGHT_RASTER_URL,
  CARTO_LIGHT_STYLE_URL,
  CARTO_RASTER_URL,
  DARK_MATTER_OVERRIDES,
  ESRI_ATTRIBUTION,
  ESRI_IMAGERY_TILE_URL,
  REGIONAL_CITIES,
  SUBURB_LABEL_MIN_ZOOM,
  WATER_COLOR,
} from "@/lib/map-constants";
import { applySatelliteStyle } from "@/lib/satellite-style";
import type { BasemapView } from "@/lib/basemap-view";
import { LIGHT_MAP_OVERRIDES, LIGHT_WATER_COLOR } from "@/lib/map-light-overrides";
import { buildAustraliaMask, buildAustraliaRegion } from "@/lib/australia-mask";
import type { ResolvedTheme } from "@/lib/theme";
import { useResolvedTheme } from "./useResolvedTheme";
import { useBasemapView } from "./useBasemapView";

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
type Style = { layers: StyleLayer[]; sources: Record<string, unknown>; transition?: { duration: number; delay: number } };

// The city layers hand off to place_city_r5/r6 at maxzoom 8 (their own
// minzoom), which avoids drawing the same city twice once the stock style's
// own tiers take over.
const CITY_LABEL_LAYOUT = {
  "text-field": "{name_en}",
  "symbol-sort-key": ["get", "priority"],
  "text-font": ["Montserrat Medium", "Open Sans Bold", "Noto Sans Regular", "HanWangHeiLight Regular", "NanumBarunGothic Regular"],
  "icon-image": "circle-11",
  "icon-offset": [16, 5],
  "text-anchor": "right",
  "icon-size": 0.4,
  "text-max-width": 8,
  "text-keep-upright": true,
  "text-offset": [0.2, 0.2],
};

const CAPITAL_CITY_LAYER: StyleLayer = {
  id: "au-capital-city-labels",
  type: "symbol",
  source: "au-capitals",
  minzoom: 0,
  maxzoom: 8,
  layout: { ...CITY_LABEL_LAYOUT, "text-size": 12 },
};

// Tier 2 starts later so density grows with zoom rather than arriving at once.
const REGIONAL_TIER_MIN_ZOOM = { 1: 3, 2: 4.5 } as const;

function regionalCityLayer(tier: 1 | 2): StyleLayer {
  return {
    id: `au-regional-city-labels-${tier}`,
    type: "symbol",
    source: "au-regional-cities",
    minzoom: REGIONAL_TIER_MIN_ZOOM[tier],
    maxzoom: 8,
    filter: ["==", ["get", "tier"], tier],
    layout: { ...CITY_LABEL_LAYOUT, "text-size": 11 },
  };
}

type MapThemeConfig = {
  styleUrl: string;
  rasterUrl: string;
  overrides: Record<string, Record<string, string | number>>;
  waterColor: string;
  capitalPaint: Record<string, string | number>;
  regionalPaint: Record<string, string | number>;
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
    regionalPaint: {
      "text-color": "rgba(233, 228, 216, 0.68)",
      "icon-color": "rgba(233, 228, 216, 0.5)",
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
    regionalPaint: {
      "text-color": "rgba(26, 33, 39, 0.75)",
      "icon-color": "rgba(26, 33, 39, 0.55)",
      "text-halo-color": "#f4f1ea",
      "text-halo-width": 1,
    },
  },
};

// Satellite view is the dark style's labels and boundaries over imagery, so the
// light theme has no satellite variant of its own.
type BasemapKey = ResolvedTheme | "satellite";

function basemapKeyFor(theme: ResolvedTheme, view: BasemapView): BasemapKey {
  return view === "satellite" ? "satellite" : theme;
}

function configFor(key: BasemapKey): MapThemeConfig {
  return MAP_THEMES[key === "satellite" ? "dark" : key];
}

function rasterUrlFor(key: BasemapKey): string {
  return key === "satellite" ? ESRI_IMAGERY_TILE_URL : MAP_THEMES[key].rasterUrl;
}

// maplibre-gl locates its worker script via import.meta.url, which only
// resolves to a real, fetchable location when the module loads as a native
// ES module - once webpack bundles it into an app chunk, that URL points at
// the chunk itself and the worker 404s silently, so no vector tiles ever
// render (only non-source style layers like the flat background do). Serving
// the worker as a static file (copied from node_modules by
// scripts/copy-maplibre-worker.js on postinstall) and pointing config.WORKER_URL
// at it directly bypasses that bundling problem.
maplibreConfig.WORKER_URL = "/maplibre-gl-worker.mjs";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function cityPoints(
  cities: readonly { name: string; lat: number; lng: number; tier?: number }[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: cities.map((city, priority) => ({
      type: "Feature",
      properties: { name_en: city.name, priority, tier: city.tier ?? 0 },
      geometry: { type: "Point", coordinates: [city.lng, city.lat] },
    })),
  };
}

// CARTO sizes this line's dashes in multiples of its width, and the width is
// 0.5px at low zoom, so the dashes are sub-pixel and drop out on 1x screens.
// A fixed 1px width and pixel-sized dashes stay legible at every zoom.
function steadyStateBoundary(layer: StyleLayer): void {
  layer.minzoom = 0;
  layer.paint = {
    ...layer.paint,
    "line-width": { stops: [[0, 1], [7, 1], [9, 1.2]] },
    "line-dasharray": [4, 3],
  };
}

// CARTO draws state lines below water, roads and buildings, so a border that
// follows a river or crosses a lake or road is buried. Moving the layer to just
// before the first label puts it with the country outlines, above the map
// features and still under the text.
function moveBelowLabels(layers: StyleLayer[], layerId: string): void {
  const from = layers.findIndex((layer) => layer.id === layerId);
  if (from < 0) return;
  const [layer] = layers.splice(from, 1);
  const firstLabel = layers.findIndex((candidate) => candidate.type === "symbol");
  layers.splice(firstLabel < 0 ? layers.length : firstLabel, 0, layer);
}

// CARTO's state line packs Australian and foreign borders into one feature at
// country zoom and leaves out the sea border at other zooms, so it cannot be
// clipped to Australia or kept steady. The layer keeps CARTO's styling and
// position but draws our own Australia-only borders instead.
function drawOwnStateBorders(layer: StyleLayer): void {
  layer.source = "au-state-borders";
  delete layer["source-layer"];
  delete layer.filter;
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

async function fetchStyle(key: BasemapKey): Promise<Style> {
  const config = configFor(key);
  const response = await fetch(config.styleUrl);
  if (!response.ok) throw new Error(`CARTO style fetch returned ${response.status}`);
  const style = (await response.json()) as Style;
  for (const layer of style.layers) {
    const override = config.overrides[layer.id];
    if (override && layer.paint) Object.assign(layer.paint, override);
    if (layer.id === "place_suburbs") startLabelsAt(layer, SUBURB_LABEL_MIN_ZOOM);
    if (layer.id === "boundary_state") {
      steadyStateBoundary(layer);
      drawOwnStateBorders(layer);
    }
  }
  style.sources["au-state-borders"] = {
    type: "geojson",
    data: AU_STATE_BORDERS_URL,
    attribution: AU_STATE_BORDERS_ATTRIBUTION,
  };
  moveBelowLabels(style.layers, "boundary_state");
  // Layers higher in the stack are placed first when labels collide, so the
  // order is tier 2, tier 1, then the capitals.
  style.sources["au-regional-cities"] = { type: "geojson", data: cityPoints(REGIONAL_CITIES) };
  style.sources["au-capitals"] = { type: "geojson", data: cityPoints(CAPITAL_CITIES) };
  style.layers.push(
    { ...regionalCityLayer(2), paint: config.regionalPaint },
    { ...regionalCityLayer(1), paint: config.regionalPaint },
    { ...CAPITAL_CITY_LAYER, paint: config.capitalPaint },
  );

  // Painted last (on top of every other layer, including neighbouring
  // countries' place labels and roads) rather than filtering each of the
  // style's ~90 layers individually - see buildAustraliaMask(). Satellite view
  // goes without it: a flat fill would cut a hard edge across the imagery.
  if (key === "satellite") {
    applySatelliteStyle(style as never, ESRI_IMAGERY_TILE_URL, buildAustraliaRegion());
  } else {
    style.sources["au-mask"] = { type: "geojson", data: buildAustraliaMask() };
    style.layers.push({
      id: "au-mask-fill",
      type: "fill",
      source: "au-mask",
      paint: { "fill-color": config.waterColor, "fill-opacity": 1 },
    });
  }

  // Paint changes fade over 300ms by default. Between two basemaps that starts
  // the new one from the old one's colours, which reads as a flash of the other
  // theme.
  style.transition = { duration: 0, delay: 0 };

  return style;
}

// Each basemap's style is fetched once and reused when it is switched back to.
// Callers get a copy because MapLibre takes ownership of what it is given.
const styleCache = new Map<BasemapKey, Promise<Style>>();

async function loadStyle(key: BasemapKey): Promise<Style> {
  let cached = styleCache.get(key);
  if (!cached) {
    cached = fetchStyle(key);
    styleCache.set(key, cached);
    cached.catch(() => styleCache.delete(key));
  }
  return structuredClone(await cached);
}

type BasemapState =
  | { kind: "gl"; layer: ReturnType<typeof L.maplibreGL>; key: BasemapKey; removed: boolean; credited: boolean }
  | { kind: "raster"; layer: L.TileLayer; key: BasemapKey; removed: boolean; credited: boolean };

// Esri's credit has to show only while its imagery does. The vector source's
// own attribution is added once by the plugin, so only this one is managed here.
function syncEsriCredit(map: L.Map, state: BasemapState): void {
  const wanted = state.key === "satellite";
  if (wanted === state.credited) return;
  if (wanted) map.attributionControl?.addAttribution(ESRI_ATTRIBUTION);
  else map.attributionControl?.removeAttribution(ESRI_ATTRIBUTION);
  state.credited = wanted;
}

type WireGlLayer = (layer: ReturnType<typeof L.maplibreGL>, state: BasemapState) => void;

// Switching into or out of satellite repaints every vector layer
// (visibility, filter and paint all change), which is enough for MapLibre
// to reload the underlying tile data on its own - but once the view is
// overzoomed past that source's own maxzoom (14, against this map's 18),
// the render that reload settles into can leave roads and buildings blank
// while labels (a different render path) draw normally on top of them, and
// nothing short of a fresh WebGL context reliably clears it (confirmed by
// reproducing the bug - zoom in fully, switch to satellite, zoom in
// further, switch back - and by testing several in-place nudges that only
// fixed it inconsistently). Replacing the layer outright runs the same,
// already-correct code path a fresh page load takes at that same zoom, at
// the cost of a brief flash and re-fetching tiles the old layer already
// had - a cost only worth paying for the transition actually shown to need
// it. A light/dark theme change on its own never involves satellite, so it
// stays on the plain in-place style patch below instead.
//
// Keeping the old layer alive and hidden (visibility: hidden) until the new
// one finished loading was tried, to swap the two in one frame instead of
// flashing the incomplete new layer - it was reverted after testing on an
// iPad: the new layer's canvas never repainted once revealed until the next
// zoom/pan forced MapLibre to redraw, which reads as the map going blank
// after a theme switch, a worse bug than the flash it was meant to fix.
// `.leaflet-gl-layer` containers also have no CSS of their own establishing
// them as positioned/stacking elements (confirmed - neither Leaflet's own
// stylesheet nor the plugin's sets it), so two of them coexisting is
// untested territory for this plugin, not just a visibility quirk.
function applyBasemapKey(map: L.Map, state: BasemapState, key: BasemapKey, wireGlLayer: WireGlLayer): void {
  if (state.key === key) return;
  const previousKey = state.key;
  state.key = key;
  syncEsriCredit(map, state);

  if (state.kind === "raster") {
    state.layer.setUrl(rasterUrlFor(key));
    return;
  }

  // The overzoomed-vector-tile bug above was only ever confirmed for a
  // satellite<->vector switch, not a same-family light/dark change - that
  // stays on the cheap, flash-free in-place style patch every basemap
  // switch used before the fix above, rather than paying a full layer
  // rebuild's cost (and its flash) for a transition never shown to need it.
  if (previousKey !== "satellite" && key !== "satellite") {
    loadStyle(key)
      .then((style) => {
        if (state.removed || state.key !== key || state.kind !== "gl") return;
        state.layer.getMaplibreMap().setStyle(style as never);
      })
      .catch((error) => console.error("Basemap style change failed:", error));
    return;
  }

  loadStyle(key)
    .then((style) => {
      if (state.removed || state.key !== key) return;
      const oldLayer = state.layer;
      let newLayer: ReturnType<typeof L.maplibreGL>;
      try {
        newLayer = L.maplibreGL({ style: style as never });
        newLayer.addTo(map);
      } catch (error) {
        console.error("Creating the replacement WebGL layer threw:", error);
        return;
      }
      wireGlLayer(newLayer, state);
      // The old layer's own context-loss listener checks state.layer against
      // the layer it was wired to, so this has to be reassigned before
      // removing the old layer below - removal itself calls
      // WEBGL_lose_context as part of cleanup, which would otherwise read as
      // a genuine loss on a layer that's already been superseded.
      state.layer = newLayer;
      try {
        map.removeLayer(oldLayer);
      } catch (error) {
        console.error("Removing the previous WebGL layer threw:", error);
      }
    })
    .catch((error) => console.error("Basemap style change failed:", error));
}

// A WebGL context can fail to create at all (blocklisted GPU driver, remote
// desktop, hardware acceleration disabled), and L.maplibreGL's onAdd throws
// partway through in that case, leaving the layer half-registered with the
// map's resize/event system so every later invalidateSize() throws too.
// Checking hasWebGL() up front avoids ever reaching that broken state.
export function VectorBasemap({
  onReady,
  onError,
}: { onReady?: () => void; onError?: (message: string) => void } = {}) {
  const map = useMap();
  const theme = useResolvedTheme();
  const view = useBasemapView();
  const key = basemapKeyFor(theme, view);
  const stateRef = useRef<BasemapState | null>(null);

  // Callers pass a fresh inline callback every render, and the theme or view
  // can change while the basemap is still loading. Listing either as a
  // dependency of the effect below would rebuild the whole basemap, so it reads
  // the latest of each through a ref instead.
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const keyRef = useRef(key);
  const wireGlLayerRef = useRef<WireGlLayer | null>(null);
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    keyRef.current = key;
  });

  useEffect(() => {
    let cancelled = false;
    let readyFired = false;
    let contextLostFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    // Confirmed on a real device (2026-09-28): webglcontextrestored never
    // fires here even minutes after a loss, preventDefault() notwithstanding
    // - the browser has given up on this context for good. Waiting on a
    // restore that also never comes just leaves the map blank forever, so
    // this is a short grace period, not a real chance at recovery.
    const CONTEXT_LOST_FALLBACK_MS = 3000;
    // "idle" (or "load" for the raster fallback) can in principle never fire -
    // a stalled tile request, a source stuck retrying, a platform quirk. The
    // loading overlay is opaque and blocks every input while it's up, so if
    // its ready signal never comes the page is stuck for good, not just
    // showing a stale map. This is the backstop: the overlay always comes
    // down within READY_TIMEOUT_MS regardless of what the map itself is doing.
    const READY_TIMEOUT_MS = 8000;
    function markReady() {
      if (readyFired) return;
      readyFired = true;
      onReadyRef.current?.();
    }
    const readyTimeout = setTimeout(markReady, READY_TIMEOUT_MS);

    function addRaster() {
      const initialKey = keyRef.current;
      const layer = L.tileLayer(rasterUrlFor(initialKey), { attribution: CARTO_ATTRIBUTION, maxZoom: 19 });
      layer.once("load", markReady);
      layer.addTo(map);
      const state: BasemapState = { kind: "raster", layer, key: initialKey, removed: false, credited: false };
      stateRef.current = state;
      syncEsriCredit(map, state);
    }

    // Wires load/error reporting and WebGL context-loss recovery onto a
    // vector layer's canvas. Called for the layer created below and again,
    // via wireGlLayerRef, for every replacement a basemap switch creates -
    // both the canvas and its WebGL context are new each time.
    const wireGlLayer: WireGlLayer = (layer, state) => {
      // "idle" only needs a source that's part of the current style to stall
      // - a slow or dropped request on any one of them, well within normal
      // mobile network variance - and, per an open MapLibre bug, "load" and
      // "idle" both then never fire at all (they don't just fire late).
      // "idle" also needs far more to succeed first: every source across the
      // whole style, not just what's initially visible, so it is exposed to
      // that bug far more often in practice. "load" is the smaller, more
      // reliable bar this map ran on before.
      const glMap = layer.getMaplibreMap();
      glMap.once("load", markReady);
      // Diagnostic only: a source failing before the map is ready is the one
      // thing that can make "load"/"idle" never fire at all rather than just
      // fire late (a documented upstream MapLibre bug), so it is otherwise
      // invisible - the loading overlay just never comes down until the
      // timeout above forces it, revealing a blank map with no indication
      // why.
      glMap.on("error", (event) => {
        if (readyFired) return;
        const sourceId = (event as { sourceId?: string }).sourceId;
        const message = event.error?.message ?? String(event.error ?? "unknown error");
        onErrorRef.current?.(sourceId ? `${sourceId}: ${message}` : message);
      });

      // maplibre-gl-js has no webglcontextlost/webglcontextrestored handling
      // anywhere in its own source (checked directly in node_modules, not
      // just its docs) - if the context dies for any reason, the canvas goes
      // blank forever with no event the library itself reacts to.
      // preventDefault() is required by the WebGL spec for the browser to
      // even attempt restoring the context, but on the device this was
      // diagnosed against it never actually restores, so this falls back to
      // the same raster tile layer used for browsers with no WebGL at all
      // rather than leaving the map blank indefinitely on a restore that
      // isn't coming.
      const canvas = layer.getCanvas();
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        // A basemap switch intentionally replaces the layer, and removing
        // the old one fires this same event as part of its own cleanup (see
        // applyBasemapKey) - a loss on a layer that's already been
        // superseded isn't a real loss to recover from.
        if (state.removed || state.layer !== layer) return;
        contextLostFallbackTimer = setTimeout(() => {
          if (state.removed || state.layer !== layer) return;
          state.removed = true;
          // Removing a maplibre-gl-leaflet layer tears down the underlying
          // maplibre Map, which runs a long chain of WebGL buffer/texture
          // cleanup against `context.gl` with no isContextLost() check
          // anywhere in that path (confirmed directly in maplibre-gl's
          // source). Against an already-dead context that cleanup can throw,
          // and since this runs synchronously before addRaster() below, an
          // uncaught throw here would silently skip the fallback entirely.
          try {
            map.removeLayer(state.layer);
          } catch (error) {
            console.error("Removing the dead WebGL layer threw:", error);
          }
          addRaster();
        }, CONTEXT_LOST_FALLBACK_MS);
      });
      canvas.addEventListener("webglcontextrestored", () => {
        if (contextLostFallbackTimer) {
          clearTimeout(contextLostFallbackTimer);
          contextLostFallbackTimer = null;
        }
      });
    };
    wireGlLayerRef.current = wireGlLayer;

    if (!hasWebGL()) {
      addRaster();
    } else {
      const initialKey = keyRef.current;
      loadStyle(initialKey)
        .then((style) => {
          if (cancelled) return;
          // Attribution comes from the vector source's own TileJSON at
          // runtime (the plugin's getAttribution() reads it off the loaded
          // maplibre source), not from an option passed in here.
          const layer = L.maplibreGL({ style: style as never });
          layer.addTo(map);
          const state: BasemapState = { kind: "gl", layer, key: initialKey, removed: false, credited: false };
          stateRef.current = state;
          syncEsriCredit(map, state);
          wireGlLayer(layer, state);
        })
        .catch((error) => {
          console.error("Vector basemap failed to load, falling back to raster tiles:", error);
          if (!cancelled) addRaster();
        });
    }

    return () => {
      cancelled = true;
      clearTimeout(readyTimeout);
      if (contextLostFallbackTimer) clearTimeout(contextLostFallbackTimer);
      const state = stateRef.current;
      if (state) {
        state.removed = true;
        if (state.credited) map.attributionControl?.removeAttribution(ESRI_ATTRIBUTION);
        try {
          map.removeLayer(state.layer);
        } catch (error) {
          console.error("Removing the WebGL layer on unmount threw:", error);
        }
        stateRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (stateRef.current && wireGlLayerRef.current) {
      applyBasemapKey(map, stateRef.current, key, wireGlLayerRef.current);
    }
  }, [map, key]);

  return null;
}
