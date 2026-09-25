// Covers the map until the basemap has drawn, so the unmasked base tiles never show
// while the Australia mask layer is still loading.
export function MapLoadingOverlay({ ready }: { ready: boolean }) {
  if (ready) return null;
  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface font-label text-sm text-foreground/50">
      Loading map&hellip;
    </div>
  );
}
