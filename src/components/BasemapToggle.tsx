"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { SATELLITE_AVAILABLE } from "@/lib/map-constants";
import { flipBasemapView, useBasemapView } from "./useBasemapView";

// A Leaflet control rather than an overlaid element, so it gets the same
// click and scroll isolation as the zoom buttons (a click on it must not reach
// the map, where the location picker would read it as a pin drop).
export function BasemapToggle() {
  const map = useMap();
  const view = useBasemapView();

  useEffect(() => {
    if (!SATELLITE_AVAILABLE) return;

    const control = new L.Control({ position: "bottomright" });
    control.onAdd = () => {
      const container = L.DomUtil.create("div", "leaflet-bar auswatch-basemap-toggle");
      const button = L.DomUtil.create("button", "", container);
      button.type = "button";
      button.textContent = view === "satellite" ? "Map" : "Satellite";
      button.setAttribute("aria-label", view === "satellite" ? "Switch to map view" : "Switch to satellite view");
      L.DomEvent.on(button, "click", flipBasemapView);
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, view]);

  return null;
}
