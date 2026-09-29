"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-theme.css";
import { MapContainer, Marker, ZoomControl, useMapEvents } from "react-leaflet";
import { AUSTRALIA_BOUNDS, AUSTRALIA_MAX_BOUNDS, MIN_ZOOM, MAX_ZOOM, WHEEL_PX_PER_ZOOM_LEVEL } from "@/lib/map-constants";
import { VectorBasemap } from "@/components/VectorBasemap";
import { isAndroid } from "@/lib/platform";
import { BasemapToggle } from "@/components/BasemapToggle";
import { FitBounds } from "@/components/FitBounds";
import { MapFlyTo, type FlyTarget } from "@/components/MapFlyTo";
import { MapSearch } from "@/components/MapSearch";
import { MapLoadingOverlay } from "@/components/MapLoadingOverlay";

const FIT_PADDING = { padding: [20, 20] as [number, number] };

export type LatLng = { lat: number; lng: number };

const pickerIcon = L.divIcon({
  className: "auswatch-marker",
  html: `<span class="auswatch-marker-dot" style="background:var(--color-accent)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function ClickHandler({ onChange }: { onChange: (point: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPickerView({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
}) {
  // MapContainer only reads center/zoom on its first render, so this only
  // matters for a value already present at mount (editing/correcting an
  // existing camera) - a value picked afterward by clicking doesn't re-center.
  const initialCenter = useMemo<[number, number]>(
    () => (value ? [value.lat, value.lng] : [-25.2744, 133.7751]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [basemapReady, setBasemapReady] = useState(false);
  const [basemapError, setBasemapError] = useState<string | null>(null);

  // Leaflet's own TouchZoom handler refuses to start a new pinch while
  // map._animatingZoom is true (see its _onTouchStart guard), and that flag is
  // cleared either by a CSS transitionend or, as a WebKit workaround, a
  // hardcoded 250ms setTimeout (Leaflet's Map.ZoomAnimation _animateZoom).
  // Reported and reproduced on Android: main-thread work placing labels and
  // the state border line after a zoom step can delay that timeout past its
  // own 250ms, so a pinch attempted in that window is silently dropped until
  // the map catches up. Disabling the animation skips this gate entirely.
  // Scoped to Android only - iOS has its own unresolved freeze on this same
  // vector map at high zoom, and disabling the animation there was tried and
  // made it worse (a stuck, unrecoverable "Loading map" state), so iOS keeps
  // the default for now.
  const skipZoomAnimation = isAndroid();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="auswatch-map-frame flex-1">
        <MapContainer
          center={initialCenter}
          zoom={value ? 12 : MIN_ZOOM}
          maxBounds={AUSTRALIA_MAX_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomSnap={0.1}
          zoomAnimation={!skipZoomAnimation}
          wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM_LEVEL}
          preferCanvas
          zoomControl={false}
          className="h-full w-full"
        >
          <ZoomControl position="bottomleft" />
          {!value && <FitBounds bounds={AUSTRALIA_BOUNDS} options={FIT_PADDING} />}
          <VectorBasemap onReady={() => setBasemapReady(true)} onError={setBasemapError} />
          <BasemapToggle />
          <MapFlyTo target={flyTarget} />
          <ClickHandler onChange={onChange} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pickerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const pos = marker.getLatLng();
                  onChange({ lat: pos.lat, lng: pos.lng });
                },
              }}
            />
          )}
        </MapContainer>

        <MapLoadingOverlay ready={basemapReady} error={basemapError} />

        <div className="absolute left-3 top-3 z-[900] watch:left-watch-control-inset">
          <MapSearch onSelect={setFlyTarget} />
        </div>
      </div>
      <p className="font-label border-t border-foreground/10 px-3 py-2 text-xs text-foreground/50">
        {value
          ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} (drag the pin to adjust)`
          : "Click the map to mark the camera's location"}
      </p>
    </div>
  );
}
