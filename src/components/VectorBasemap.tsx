"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { useMap } from "react-leaflet";
import { CAPITAL_CITY_NAMES, CARTO_ATTRIBUTION, CARTO_DARK_MATTER_STYLE_URL, CARTO_RASTER_URL, DARK_MATTER_OVERRIDES, MIN_ZOOM, WATER_COLOR } from "@/lib/map-constants";
import { buildAustraliaMask } from "@/lib/australia-mask";

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
  paint: {
    "text-color": "rgba(233, 228, 216, 0.85)",
    "icon-color": "rgba(217, 164, 65, 0.9)",
    "text-halo-color": "#0a0d11",
    "text-halo-width": 1,
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

async function loadDarkMatterStyle(): Promise<Style> {
  const response = await fetch(CARTO_DARK_MATTER_STYLE_URL);
  if (!response.ok) throw new Error(`CARTO style fetch returned ${response.status}`);
  const style = (await response.json()) as Style;
  for (const layer of style.layers) {
    const override = DARK_MATTER_OVERRIDES[layer.id];
    if (override && layer.paint) Object.assign(layer.paint, override);
  }
  style.layers.push(CAPITAL_CITY_LAYER);

  // Painted last (on top of every other layer, including neighbouring
  // countries' place labels and roads) rather than filtering each of the
  // style's ~90 layers individually - see buildAustraliaMask().
  style.sources["au-mask"] = { type: "geojson", data: buildAustraliaMask() };
  style.layers.push({
    id: "au-mask-fill",
    type: "fill",
    source: "au-mask",
    paint: { "fill-color": WATER_COLOR, "fill-opacity": 1 },
  });

  return style;
}

// A WebGL context can fail to create at all (blocklisted GPU driver, remote
// desktop, hardware acceleration disabled), and L.maplibreGL's onAdd throws
// partway through in that case, leaving the layer half-registered with the
// map's resize/event system so every later invalidateSize() throws too.
// Checking hasWebGL() up front avoids ever reaching that broken state.
export function VectorBasemap({ onReady }: { onReady?: () => void } = {}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  // Callers pass a fresh inline callback every render. Listing it as a
  // dependency of the effect below would rebuild the whole basemap each time,
  // so the effect reads the latest one through a ref instead.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;

    function addRaster() {
      const layer = L.tileLayer(CARTO_RASTER_URL, { attribution: CARTO_ATTRIBUTION, maxZoom: 19 });
      layer.once("load", () => onReadyRef.current?.());
      layer.addTo(map);
      layerRef.current = layer;
    }

    if (!hasWebGL()) {
      addRaster();
    } else {
      loadDarkMatterStyle()
        .then((style) => {
          if (cancelled) return;
          // Attribution comes from the vector source's own TileJSON at
          // runtime (the plugin's getAttribution() reads it off the loaded
          // maplibre source), not from an option passed in here.
          const layer = L.maplibreGL({ style: style as never });
          layer.addTo(map);
          layerRef.current = layer;
          layer.getMaplibreMap().once("load", () => onReadyRef.current?.());
        })
        .catch((error) => {
          console.error("Vector basemap failed to load, falling back to raster tiles:", error);
          if (!cancelled) addRaster();
        });
    }

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
}
