"use client";

import { useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-theme.css";
import { MapContainer, Marker } from "react-leaflet";
import { AUSTRALIA_MAX_BOUNDS, MIN_ZOOM, MAX_ZOOM, WHEEL_PX_PER_ZOOM_LEVEL } from "@/lib/map-constants";
import { VectorBasemap } from "@/components/VectorBasemap";
import { isAndroid } from "@/lib/platform";
import { BasemapToggle } from "@/components/BasemapToggle";
import { MapLoadingOverlay } from "@/components/MapLoadingOverlay";

const markerIcon = L.divIcon({
  className: "auswatch-marker",
  html: `<span class="auswatch-marker-dot" style="background:var(--color-accent)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const sensitiveSiteIcon = L.divIcon({
  className: "auswatch-marker",
  html: `<span class="auswatch-marker-dot auswatch-marker-hollow" style="--marker-color:#C1443D"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function TicketLocationMapView({
  lat,
  lng,
  sensitiveSites,
}: {
  lat: number;
  lng: number;
  sensitiveSites?: { lat: number; lng: number }[];
}) {
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
    <div className="relative isolate h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        maxBounds={AUSTRALIA_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        zoomSnap={0.1}
        zoomAnimation={!skipZoomAnimation}
        wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM_LEVEL}
        preferCanvas
        className="h-full w-full"
      >
        <VectorBasemap onReady={() => setBasemapReady(true)} onError={setBasemapError} />
        <BasemapToggle />
        {sensitiveSites?.map((site, i) => (
          <Marker key={i} position={[site.lat, site.lng]} icon={sensitiveSiteIcon} />
        ))}
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
      <MapLoadingOverlay ready={basemapReady} error={basemapError} />
    </div>
  );
}
