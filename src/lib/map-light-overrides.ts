import { DARK_MATTER_OVERRIDES } from "@/lib/map-constants";

export const LIGHT_LAND_COLOR = "#e9e4d8";
export const LIGHT_WATER_COLOR = "#c9d3d6";

// CARTO's dark-matter and positron styles share the same layer ids, so the
// light map reuses the dark palette's per-layer override list and only
// translates its colours. Every distinct hex in the dark list needs an entry
// here (a test enforces it); the road fills step from a warm off-white up to
// pure white so larger roads still read as heavier.
const HEX_TO_LIGHT: Record<string, string> = {
  "#232b34": LIGHT_LAND_COLOR,
  "#121921": LIGHT_WATER_COLOR,
  "#334353": "#b4c2c7",
  "#333f4a": "#cfc8b8",
  "#3c4854": "#d5cfc0",
  "#141a20": "#d3cdbe",
  "#0a0d11": "#f4f1ea",
  "#10151a": "#f4f1ea",
  "#2c353f": "#f0ece1",
  "#343f4a": "#f6f3ea",
  "#3d4954": "#faf8f2",
  "#47535f": "#fdfcf8",
  "#505d6a": "#ffffff",
  "#374250": "#c4bdad",
  "#28313b": "#ddd7c9",
};

const RGBA = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/;
const round = (n: number) => Math.round(n * 100) / 100;

// Light text needs more opacity than dark-on-dark to stay legible, so text and
// icon alphas are lifted; lines keep close to their original weight.
function rgbaToLight(prop: string, value: string): string {
  const match = RGBA.exec(value);
  if (!match) return value;
  const key = `${match[1]},${match[2]},${match[3]}`;
  const alpha = Number(match[4]);
  const isLine = prop.startsWith("line-");

  if (key === "233,228,216") {
    return isLine ? `rgba(26, 33, 39, ${round(alpha + 0.05)})` : `rgba(26, 33, 39, ${round(0.3 + 0.7 * alpha)})`;
  }
  if (key === "217,164,65") {
    return `rgba(143, 98, 18, ${round(Math.min(1, alpha + (isLine ? 0.15 : 0.1)))})`;
  }
  if (key === "10,13,17") return `rgba(244, 241, 234, ${alpha})`;
  return value;
}

function toLight(prop: string, value: string | number): string | number {
  if (typeof value === "number") return value;
  if (value.startsWith("#")) return HEX_TO_LIGHT[value] ?? value;
  return rgbaToLight(prop, value);
}

export function deriveLightOverrides(
  dark: Record<string, Record<string, string | number>>,
): Record<string, Record<string, string | number>> {
  return Object.fromEntries(
    Object.entries(dark).map(([layerId, paint]) => [
      layerId,
      Object.fromEntries(Object.entries(paint).map(([prop, value]) => [prop, toLight(prop, value)])),
    ]),
  );
}

export const LIGHT_MAP_OVERRIDES = deriveLightOverrides(DARK_MATTER_OVERRIDES);
