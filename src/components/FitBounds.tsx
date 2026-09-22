"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression, FitBoundsOptions } from "leaflet";

// MapContainer's own `bounds` prop fits the view inside the ref callback that
// mounts the Leaflet map - before the surrounding flex layout has necessarily
// settled, so `getSize()` can read a stale/undersized container and compute
// too low a zoom. Effects run after layout commits, so invalidateSize() here
// gets the container's real size before fitBounds() uses it.
//
// Also raises the map's minZoom to whatever zoom this fit lands on, so
// zooming out can never go far enough to reveal the rest of the world - a
// fixed minZoom constant works for one viewport width but not others (a wide
// enough monitor shows most of the globe at the same zoom level a laptop
// screen shows only Australia at). minZoom is reset to 0 before recomputing
// so the previous floor doesn't clamp the new calculation, and the whole
// thing reruns on resize since a wider viewport needs a lower floor and a
// narrower one a higher one.
export function FitBounds({ bounds, options }: { bounds: LatLngBoundsExpression; options?: FitBoundsOptions }) {
  const map = useMap();

  useEffect(() => {
    const padding = L.point((options?.padding as [number, number]) ?? [0, 0]);

    function fit() {
      map.invalidateSize();
      map.setMinZoom(0);
      const fitZoom = map.getBoundsZoom(bounds, false, padding);
      // Floored: leaflet.markercluster indexes its per-zoom grids by integer
      // zoom level, built down to map.getMinZoom(). A fractional floor here
      // (fitZoom is fractional under zoomSnap=0.1) leaves the grid for the
      // actual rendered zoom's floor never built, and every marker added
      // afterward silently drops instead of appearing. fitBounds() below
      // still lands on the precise fractional fitZoom - only the enforced
      // floor is rounded, which just permits a hair more zoom-out than ideal.
      map.setMinZoom(Math.floor(fitZoom));
      map.fitBounds(bounds, options);
    }

    fit();
    map.on("resize", fit);
    return () => {
      map.off("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}
