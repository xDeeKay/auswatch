"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-theme.css";
import { MapContainer, Marker } from "react-leaflet";
import { AUSTRALIA_MAX_BOUNDS, MIN_ZOOM, MAX_ZOOM } from "@/lib/map-constants";
import { VectorBasemap } from "@/components/VectorBasemap";

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
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      maxBounds={AUSTRALIA_MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomSnap={0.1}
      preferCanvas
      className="h-full w-full"
    >
      <VectorBasemap />
      {sensitiveSites?.map((site, i) => (
        <Marker key={i} position={[site.lat, site.lng]} icon={sensitiveSiteIcon} />
      ))}
      <Marker position={[lat, lng]} icon={markerIcon} />
    </MapContainer>
  );
}
