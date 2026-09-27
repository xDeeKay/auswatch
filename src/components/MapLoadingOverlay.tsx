// Covers the map until the basemap has drawn, so the unmasked base tiles never show
// while the Australia mask layer is still loading.
export function MapLoadingOverlay({ ready, error }: { ready: boolean; error?: string | null }) {
  if (ready) return null;
  return (
    <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-surface px-6 text-center font-label text-sm text-foreground/50">
      <p>Loading map&hellip;</p>
      {error && <p className="max-w-sm text-xs text-foreground/40">Map data failed to load: {error}</p>}
    </div>
  );
}
