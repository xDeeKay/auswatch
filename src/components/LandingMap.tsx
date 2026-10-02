import Link from "next/link";
import { buildAustraliaOutlinePaths, project, LANDING_MAP_WIDTH, LANDING_MAP_HEIGHT } from "@/lib/landing-map";
import type { PublicCamera } from "@/lib/cameras";

// The same land fill the real /map uses (see LAND_COLOR in map-constants.ts
// and its light-theme equivalent), so the two stay visually consistent
// rather than this map drifting from whatever `--color-map-backdrop`
// (the Leaflet container's own backdrop, tuned separately per theme) ends
// up being. The stroke is a neutral tint of the foreground rather than the
// accent color, so the amber markers stay the only amber thing on the map.
const OUTLINE_STYLE = {
  fill: "var(--color-map-land)",
  stroke: "rgb(var(--color-foreground-rgb) / 0.3)",
  strokeWidth: 1.5,
  strokeLinejoin: "round" as const,
};

export function LandingMap({ cameras }: { cameras: PublicCamera[] }) {
  const outlines = buildAustraliaOutlinePaths();

  return (
    <svg
      viewBox={`0 0 ${LANDING_MAP_WIDTH} ${LANDING_MAP_HEIGHT}`}
      className="mx-auto block w-full max-w-[480px]"
      role="img"
      aria-label={`Map of Australia marking ${cameras.length.toLocaleString("en-AU")} recorded camera locations`}
    >
      <defs>
        <radialGradient id="landing-map-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/*
        A plain wrapping <Link> around the whole SVG would make its empty
        space (everything outside the coastline and the markers) clickable
        too, since an <a> hit-tests its full rectangular box regardless of
        what's painted inside it. Nesting the link here instead, directly
        around just the outline shapes and the markers, keeps the clickable
        area to what's actually drawn - SVG's own pointer-event hit-testing
        for a filled shape already respects its painted area, not its
        bounding box.
      */}
      <Link href="/map" aria-label="Explore the map">
        <g className="transition-opacity hover:opacity-80">
          {outlines.map((d, i) => (
            <path key={i} d={d} style={OUTLINE_STYLE} />
          ))}

          {cameras.map((camera) => {
            const [x, y] = project(camera.lng, camera.lat);
            return (
              <g key={camera.id}>
                <circle cx={x} cy={y} r={10} fill="url(#landing-map-glow)" />
                <circle cx={x} cy={y} r={3.5} fill="var(--color-accent)" />
              </g>
            );
          })}
        </g>
      </Link>
    </svg>
  );
}
