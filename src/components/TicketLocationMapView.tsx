"use client";

import { useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-theme.css";
import { MapContainer, Marker } from "react-leaflet";
import { AUSTRALIA_MAX_BOUNDS, MIN_ZOOM, MAX_ZOOM, WHEEL_PX_PER_ZOOM_LEVEL } from "@/lib/map-constants";
import { VectorBasemap } from "@/components/VectorBasemap";
import { isIOS } from "@/lib/platform";
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

  // The maplibre-gl-leaflet plugin only binds its post-zoom resize/redraw
  // handler when zoomAnimation is on (see its onAdd), and that handler does a
  // full canvas resize, jumpTo and redraw after every zoom - pinch or button
  // alike. On iOS Safari that cost compounds enough to freeze the page at
  // higher zoom levels, needing a reload. Desktop and Android keep the
  // animation; see src/lib/platform.ts for why the UA alone cannot detect iOS.
  const skipZoomAnimation = isIOS();

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
        <VectorBasemap onReady={() => setBasemapReady(true)} />
        <BasemapToggle />
        {sensitiveSites?.map((site, i) => (
          <Marker key={i} position={[site.lat, site.lng]} icon={sensitiveSiteIcon} />
        ))}
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
      <MapLoadingOverlay ready={basemapReady} />
    </div>
  );
}
