"use client";

import { useSyncExternalStore } from "react";
import { BASEMAP_VIEW_STORAGE_KEY, parseBasemapView, toggleBasemapView, type BasemapView } from "@/lib/basemap-view";
import { SATELLITE_AVAILABLE } from "@/lib/map-constants";

const CHANGE_EVENT = "auswatch-basemap-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): BasemapView {
  if (!SATELLITE_AVAILABLE) return "map";
  try {
    return parseBasemapView(window.localStorage.getItem(BASEMAP_VIEW_STORAGE_KEY));
  } catch {
    return "map";
  }
}

// One choice shared by every map on the page and remembered across visits.
export function useBasemapView(): BasemapView {
  return useSyncExternalStore(subscribe, getSnapshot, () => "map");
}

export function flipBasemapView(): void {
  try {
    window.localStorage.setItem(BASEMAP_VIEW_STORAGE_KEY, toggleBasemapView(getSnapshot()));
  } catch {
    // Storage can be blocked; the choice then lasts only until reload.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
