"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export type FlyTarget = {
  lat: number;
  lng: number;
  // [south-west, north-east], same shape as AUSTRALIA_BOUNDS. When present,
  // the view fits this box instead of just centering on lat/lng, so a
  // suburb-level result zooms out further than a street-address result.
  bounds?: [[number, number], [number, number]];
};

export function MapFlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    if (target.bounds) {
      map.flyToBounds(target.bounds, { padding: [40, 40], maxZoom: 15, duration: 1 });
    } else {
      map.flyTo([target.lat, target.lng], 14, { duration: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return null;
}
