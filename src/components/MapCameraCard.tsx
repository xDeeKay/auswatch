"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type L from "leaflet";
import { useMap } from "react-leaflet";
import type { PublicCamera } from "@/lib/cameras";
import { placeCard, type CardPlacement, type PlacementOptions } from "@/lib/card-placement";
import { CameraCard } from "@/components/CameraCard";

const PLACEMENT: PlacementOptions = { gap: 16, margin: 12, topInset: 12, arrowInset: 16 };

export function MapCameraCard({ camera, onClose }: { camera: PublicCamera; onClose: () => void }) {
  const map = useMap();
  const container = map.getContainer();
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<CardPlacement | null>(null);
  const [zooming, setZooming] = useState(false);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    function compute() {
      const el = cardRef.current;
      if (!el) return null;
      const point = map.latLngToContainerPoint([camera.lat, camera.lng]);
      const size = map.getSize();
      return placeCard(
        { x: point.x, y: point.y },
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: size.x, height: size.y },
        PLACEMENT
      );
    }

    function reposition() {
      const next = compute();
      if (next) setPlacement(next);
    }

    const initial = compute();
    if (initial) {
      setPlacement(initial);
      if (initial.pan.x !== 0 || initial.pan.y !== 0) map.panBy([initial.pan.x, initial.pan.y]);
    }

    function onZoomStart() {
      setZooming(true);
    }
    function onZoomEnd() {
      setZooming(false);
      reposition();
    }

    map.on("move resize", reposition);
    map.on("zoomstart", onZoomStart);
    map.on("zoomend", onZoomEnd);
    const observer = new ResizeObserver(reposition);
    observer.observe(card);

    // The card lives inside the map container, so gestures on it would
    // otherwise drag, zoom or double-click-zoom the map underneath.
    // Click is left alone: React needs it, and the map click handler below
    // ignores clicks that originate in the card.
    const GESTURES = ["mousedown", "touchstart", "dblclick", "wheel"] as const;
    const stop = (event: Event) => event.stopPropagation();
    for (const type of GESTURES) card.addEventListener(type, stop, { passive: true });

    return () => {
      map.off("move resize", reposition);
      map.off("zoomstart", onZoomStart);
      map.off("zoomend", onZoomEnd);
      observer.disconnect();
      for (const type of GESTURES) card.removeEventListener(type, stop);
    };
  }, [map, camera.id, camera.lat, camera.lng]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    // Clicks on the map itself are handled by the map's own click event so a
    // pan drag doesn't dismiss the card; this covers everything else.
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target) return;
      if (cardRef.current?.contains(target) || map.getContainer().contains(target)) return;
      onClose();
    }

    function onMapClick(event: L.LeafletMouseEvent) {
      if (cardRef.current?.contains(event.originalEvent.target as Node)) return;
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    map.on("click", onMapClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      map.off("click", onMapClick);
    };
  }, [map, onClose]);

  const hidden = !placement || zooming || !placement.markerVisible;

  return createPortal(
    <div
      ref={cardRef}
      role="region"
      aria-label="Camera details"
      className="absolute z-[900] w-[22rem] cursor-auto rounded border border-foreground/20 bg-surface p-4 shadow-lg"
      style={{
        left: placement?.left ?? 0,
        top: placement?.top ?? 0,
        maxWidth: "calc(100% - 1.5rem)",
        visibility: hidden ? "hidden" : "visible",
      }}
    >
      <CameraCard camera={camera} onClose={onClose} />
      <span
        aria-hidden="true"
        className="absolute -bottom-[6px] h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-foreground/20 bg-surface"
        style={{ left: (placement?.arrowX ?? 0) - 1 }}
      />
    </div>,
    container
  );
}
