import Link from "next/link";
import { STATUS_COLOR } from "@/lib/camera-labels";
import { buildAustraliaOutlinePaths, project, LANDING_MAP_WIDTH, LANDING_MAP_HEIGHT } from "@/lib/landing-map";
import type { PublicCamera } from "@/lib/cameras";
import { CameraStatus } from "@/generated/prisma/enums";

const STATUS_ORDER: CameraStatus[] = [CameraStatus.active, CameraStatus.removed, CameraStatus.unconfirmed];

// Opaque (the same panel color the real Leaflet map sits on, behind its
// own tiles) rather than a translucent tint of the page background, so the
// coastline reads as a distinct layer rather than blending into whatever
// sits behind it.
const OUTLINE_STYLE = {
  fill: "var(--color-map-backdrop)",
  stroke: "var(--color-accent)",
  strokeOpacity: 0.5,
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
        {STATUS_ORDER.map((status) => (
          <radialGradient key={status} id={`landing-map-glow-${status}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STATUS_COLOR[status]} stopOpacity="0.5" />
            <stop offset="100%" stopColor={STATUS_COLOR[status]} stopOpacity="0" />
          </radialGradient>
        ))}
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
                <circle cx={x} cy={y} r={10} fill={`url(#landing-map-glow-${camera.status})`} />
                <circle cx={x} cy={y} r={3.5} fill={STATUS_COLOR[camera.status]} />
              </g>
            );
          })}
        </g>
      </Link>
    </svg>
  );
}
