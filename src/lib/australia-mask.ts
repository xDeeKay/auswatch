// The full Mercator-renderable extent, not just a box around Australia - a
// tighter rectangle left a gap beyond it on a wide/zoomed-out viewport with
// nothing rendered at all, which fell through to the plain .leaflet-container
// CSS background (map-theme.css) instead of either the mask or a real map
// layer, showing up as a visibly different-colored patch from the actual
// water fill. Covering the whole extent means there's always either the mask
// or the real map underneath, never bare CSS background.
const WORLD_RING: number[][] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

// Traces a boundary well out in open ocean around mainland Australia and
// Tasmania, rather than the real coastline - this only needs to keep
// neighbouring countries out, not hug the coast, so a hand-picked line with a
// wide safety margin against real coastal geography (tens of km at minimum)
// is far more robust than a precise-but-fallible dataset: an earlier version
// of this mask used the real (simplified, ~500m-tolerance) state boundary
// polygons from au-state-boundaries.ts, and that tolerance was enough to
// visibly clip real coastline near Fremantle. The one place this line has to
// thread a genuinely tight gap is the Torres Strait, where Australia's own
// islands sit only ~150km from Papua New Guinea's south coast - the cutoff
// there favours excluding PNG over keeping the northernmost of those
// islands, since the camera dataset has no plausible reason to reach them.
//
// East of Cape York the line tightens quickly (rather than holding the
// Torres Strait latitude all the way to the edge) specifically to clear
// PNG's eastern islands - the Trobriands, D'Entrecasteaux and Louisiade
// Archipelago all sit as far south as -11.6, well south of the Trans-Fly
// coast the Torres Strait cutoff was tuned against. The edge stops at 157°E,
// short of Lord Howe Island (already out of scope) and Solomon Islands
// territory, so New Zealand and everything further east never needs its own
// carve-out at all.
const AUSTRALIA_RING: number[][] = [
  [100, -47],
  [100, -11],
  [120, -11],
  [128, -10.8],
  [136, -10.5],
  [140, -9.8],
  [144, -9.4],
  [148, -11.5],
  [152, -13],
  [157, -15],
  [157, -47],
  [100, -47],
];

function signedArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

// MapLibre classifies a polygon ring as an outer shell or a hole by its
// winding direction relative to the first ring, not by GeoJSON's RFC 7946
// convention specifically - so the exact winding of the source data doesn't
// matter as long as the shell and its holes are wound oppositely.
function withWinding(ring: number[][], counterClockwise: boolean): number[][] {
  const isCcw = signedArea(ring) > 0;
  return isCcw === counterClockwise ? ring : [...ring].reverse();
}

// One Polygon feature: a world-sized shell with a single hole punched out
// around Australia, which paints over everything outside it (neighbouring
// countries' land, place labels, roads) in a single fill layer appended on
// top of the CARTO style's own layers, rather than filtering dozens of
// individual style layers.
export function buildAustraliaMask(): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [withWinding(WORLD_RING, true), withWinding(AUSTRALIA_RING, false)],
    },
  };
}
