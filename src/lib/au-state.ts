import { AU_STATE_BOUNDARIES } from "@/lib/au-state-boundaries";
import type { AuState } from "@/generated/prisma/enums";

type Point = { lat: number; lng: number };

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function deriveAuState(point: Point): AuState | null {
  const { lat, lng } = point;
  for (const [state, shapes] of Object.entries(AU_STATE_BOUNDARIES) as [AuState, number[][][][]][]) {
    for (const shape of shapes) {
      const [outer, ...holes] = shape;
      if (!outer || !pointInRing(lng, lat, outer)) continue;
      if (holes.some((hole) => pointInRing(lng, lat, hole))) continue;
      return state;
    }
  }
  return null;
}
