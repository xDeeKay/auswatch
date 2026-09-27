import fs from "node:fs";
import path from "node:path";
import { extractSharedBorders, type Ring } from "@/lib/state-borders";

// Rebuilds public/au-state-borders.geojson: the borders between Australian
// states and territories, without their coastlines, for the map's state line.
// Source: ABS Australian Statistical Geography Standard (ASGS) 2021, State and
// Territory, published under CC BY 4.0. State borders almost never change, so
// this only needs re-running if the ABS republishes them.
//
//   npx tsx scripts/build-au-state-borders.ts

const SERVICE = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/STE/MapServer/0/query";
const STATE_CODES: Record<string, string> = { "1": "nsw", "2": "vic", "3": "qld", "4": "sa", "5": "wa", "6": "tas", "7": "nt", "8": "act" };

// Detail requested from the service, in degrees (about 4 m). Then, in metres: how
// closely two states' edges must agree to count as the same border (the ABS
// outlines differ by up to ~130 m in remote stretches), the shortest run kept,
// and how far the result is simplified.
const SERVICE_DETAIL_DEGREES = 0.00004;
const TOLERANCE_METRES = 200;
const MIN_LENGTH_METRES = 2000;
const SIMPLIFY_METRES = 8;

type Feature = { properties: { state_code_2021: string }; geometry: { type: string; coordinates: number[][][][] | number[][][] } };

async function main() {
  const params = new URLSearchParams({
    where: `state_code_2021 IN (${Object.keys(STATE_CODES).map((code) => `'${code}'`).join(",")})`,
    outFields: "state_code_2021",
    outSR: "4326",
    geometryPrecision: "6",
    maxAllowableOffset: String(SERVICE_DETAIL_DEGREES),
    f: "geojson",
  });
  const response = await fetch(`${SERVICE}?${params}`);
  if (!response.ok) throw new Error(`ABS service returned ${response.status}`);
  const { features } = (await response.json()) as { features: Feature[] };

  const states: Record<string, Ring[]> = {};
  for (const feature of features) {
    const id = STATE_CODES[feature.properties.state_code_2021];
    const polygons = (feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates]) as number[][][][];
    states[id] = polygons.flatMap((polygon) => polygon) as Ring[];
  }
  const missing = Object.values(STATE_CODES).filter((id) => !states[id]);
  if (missing.length) throw new Error(`ABS service did not return: ${missing.join(", ")}`);

  const lines = extractSharedBorders(states, {
    toleranceMetres: TOLERANCE_METRES,
    simplifyMetres: SIMPLIFY_METRES,
    minLengthMetres: MIN_LENGTH_METRES,
  });
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  const geojson = {
    type: "FeatureCollection",
    features: lines.map((line) => ({
      type: "Feature",
      properties: { a: line.a, b: line.b },
      geometry: { type: "LineString", coordinates: line.coords.map(([lng, lat]) => [round(lng), round(lat)]) },
    })),
  };

  const out = path.join(process.cwd(), "public", "au-state-borders.geojson");
  fs.writeFileSync(out, JSON.stringify(geojson));
  const points = lines.reduce((sum, line) => sum + line.coords.length, 0);
  console.log(`Wrote ${lines.length} borders (${points} points) to ${path.relative(process.cwd(), out)}`);
  for (const line of lines) console.log(`  ${line.a}/${line.b}: ${line.coords.length} points`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
