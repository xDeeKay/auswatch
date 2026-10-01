import { AU_STATE_BOUNDARIES } from "@/lib/au-state-boundaries";
import { simplifyLine, type Point } from "@/lib/state-borders";
import { AUSTRALIA_BOUNDS } from "@/lib/map-constants";

// A small decorative map (the landing page hero) doesn't need the ~500m
// detail the real interactive map's state boundaries carry - this cuts it
// down further so the outline stays light without drifting from the real
// coastline into a hand-guessed shape.
const OUTLINE_SIMPLIFY_TOLERANCE_METRES = 10000;

export const LANDING_MAP_WIDTH = 600;

const [[SOUTH, WEST], [NORTH, EAST]] = AUSTRALIA_BOUNDS;
const LNG_SPAN = EAST - WEST;
const LAT_SPAN = NORTH - SOUTH;
// Longitude degrees cover less real distance than latitude degrees away from
// the equator - without this, the outline renders visibly too wide for its
// height.
const LAT_COS = Math.cos((((NORTH + SOUTH) / 2) * Math.PI) / 180);
const SCALE = LANDING_MAP_WIDTH / (LNG_SPAN * LAT_COS);
export const LANDING_MAP_HEIGHT = Math.round(LAT_SPAN * SCALE);

export function project(lng: number, lat: number): [number, number] {
  return [(lng - WEST) * LAT_COS * SCALE, (NORTH - lat) * SCALE];
}

function ringToPath(ring: Point[]): string {
  const projected = ring.map(([lng, lat]) => project(lng, lat));
  return projected.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";
}

let cachedOutlinePaths: string[] | null = null;

// One path per state/territory shape (its outer ring only - a decorative
// map at this scale doesn't need enclaves like the ACT cut out of NSW), all
// drawn with the same fill/stroke so they read as one continuous landmass
// with its state divisions visible, not as a single dissolved coastline.
export function buildAustraliaOutlinePaths(): string[] {
  if (cachedOutlinePaths) return cachedOutlinePaths;
  const paths: string[] = [];
  for (const shapes of Object.values(AU_STATE_BOUNDARIES)) {
    for (const rings of shapes) {
      const outerRing = rings[0];
      if (!outerRing || outerRing.length < 3) continue;
      const simplified = simplifyLine(outerRing as Point[], OUTLINE_SIMPLIFY_TOLERANCE_METRES);
      if (simplified.length < 3) continue;
      paths.push(ringToPath(simplified));
    }
  }
  cachedOutlinePaths = paths;
  return paths;
}
