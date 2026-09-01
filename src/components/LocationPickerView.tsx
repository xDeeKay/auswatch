"use client";

import { useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map-theme.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { AUSTRALIA_CENTER, DEFAULT_ZOOM, MIN_ZOOM, DARK_TILE_URL, DARK_TILE_ATTRIBUTION } from "@/lib/map-constants";

export type LatLng = { lat: number; lng: number };

const pickerIcon = L.divIcon({
  className: "auswatch-marker",
  html: `<span class="auswatch-marker-dot" style="background:#D9A441"></span>`,
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
  const center = useMemo<[number, number]>(
    () => (value ? [value.lat, value.lng] : AUSTRALIA_CENTER),
    [value]
  );

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1">
        <MapContainer center={center} zoom={value ? 12 : DEFAULT_ZOOM} minZoom={MIN_ZOOM} className="h-full w-full">
          <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
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
      </div>
      <p className="font-mono border-t border-parchment/10 px-3 py-2 text-xs text-parchment/50">
        {value
          ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} (drag the pin to adjust)`
          : "Click the map to mark the camera's location"}
      </p>
    </div>
  );
}
