export type Point = [number, number];
export type Ring = Point[];

export type BorderLine = { a: string; b: string; coords: Point[] };

const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LNG_AT_EQUATOR = 111320;
const CELL_DEG = 0.01;

function metresPerDegLng(lat: number): number {
  return M_PER_DEG_LNG_AT_EQUATOR * Math.cos((lat * Math.PI) / 180);
}

function pointToSegmentMetres(p: Point, a: Point, b: Point): number {
  const k = metresPerDegLng(p[1]);
  const ax = (a[0] - p[0]) * k;
  const ay = (a[1] - p[1]) * M_PER_DEG_LAT;
  const bx = (b[0] - p[0]) * k;
  const by = (b[1] - p[1]) * M_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

type Segment = [Point, Point];
type Grid = Map<string, Segment[]>;

function buildGrid(rings: Ring[]): Grid {
  const grid: Grid = new Map();
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      const x0 = Math.floor(Math.min(a[0], b[0]) / CELL_DEG);
      const x1 = Math.floor(Math.max(a[0], b[0]) / CELL_DEG);
      const y0 = Math.floor(Math.min(a[1], b[1]) / CELL_DEG);
      const y1 = Math.floor(Math.max(a[1], b[1]) / CELL_DEG);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const key = `${x},${y}`;
          const cell = grid.get(key);
          if (cell) cell.push([a, b]);
          else grid.set(key, [[a, b]]);
        }
      }
    }
  }
  return grid;
}

function isWithin(grid: Grid, p: Point, toleranceMetres: number): boolean {
  const cx = Math.floor(p[0] / CELL_DEG);
  const cy = Math.floor(p[1] / CELL_DEG);
  for (let x = cx - 1; x <= cx + 1; x++) {
    for (let y = cy - 1; y <= cy + 1; y++) {
      const cell = grid.get(`${x},${y}`);
      if (!cell) continue;
      for (const [a, b] of cell) {
        if (pointToSegmentMetres(p, a, b) <= toleranceMetres) return true;
      }
    }
  }
  return false;
}

export function simplifyLine(points: Point[], toleranceMetres: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let farthest = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = pointToSegmentMetres(points[i], points[start], points[end]);
      if (d > farthest) {
        farthest = d;
        index = i;
      }
    }
    if (farthest > toleranceMetres && index > 0) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

function lengthMetres(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const k = metresPerDegLng(points[i][1]);
    total += Math.hypot((points[i + 1][0] - points[i][0]) * k, (points[i + 1][1] - points[i][1]) * M_PER_DEG_LAT);
  }
  return total;
}

// The stretches of one polygon's boundary that another polygon also runs
// along, i.e. the border between two states with the coastline left out. Two
// neighbouring official boundaries do not agree exactly (the ABS ones differ by
// up to ~130m in remote stretches), so the shared edge is matched within a
// tolerance instead of vertex for vertex. Runs shorter than minLengthMetres are
// dropped: where two coastlines pass close to each other at a border's end they
// leave short false matches.
export function extractSharedBorders(
  states: Record<string, Ring[]>,
  {
    toleranceMetres,
    simplifyMetres,
    minLengthMetres,
  }: { toleranceMetres: number; simplifyMetres: number; minLengthMetres: number },
): BorderLine[] {
  const ids = Object.keys(states).sort();
  const grids = Object.fromEntries(ids.map((id) => [id, buildGrid(states[id])]));
  const lines: BorderLine[] = [];

  for (const a of ids) {
    for (const b of ids) {
      if (a >= b) continue;
      for (const ring of states[a]) {
        const shared: boolean[] = [];
        for (let i = 0; i < ring.length - 1; i++) {
          const p = ring[i];
          const q = ring[i + 1];
          const middle: Point = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
          shared.push(
            isWithin(grids[b], p, toleranceMetres) &&
              isWithin(grids[b], q, toleranceMetres) &&
              isWithin(grids[b], middle, toleranceMetres),
          );
        }
        if (!shared.some(Boolean)) continue;

        const whole = shared.every(Boolean);
        const start = whole ? 0 : shared.indexOf(false);
        let run: Point[] = [];
        const flush = () => {
          if (run.length > 1 && lengthMetres(run) >= minLengthMetres) {
            lines.push({ a, b, coords: simplifyLine(run, simplifyMetres) });
          }
          run = [];
        };
        for (let step = 0; step < shared.length; step++) {
          const i = (start + step) % shared.length;
          if (shared[i]) {
            if (run.length === 0) run.push(ring[i]);
            run.push(ring[i + 1]);
          } else {
            flush();
          }
        }
        flush();
      }
    }
  }
  return lines;
}
