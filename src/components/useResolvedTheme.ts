"use client";

import { useSyncExternalStore } from "react";
import { resolveTheme, type ResolvedTheme } from "@/lib/theme";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia(LIGHT_QUERY);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): ResolvedTheme {
  return resolveTheme(document.documentElement.getAttribute("data-theme"), window.matchMedia(LIGHT_QUERY).matches);
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => "dark");
}
