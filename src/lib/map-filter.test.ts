import { describe, expect, it } from "vitest";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";
import { legacyFilterToExpression, restrictToRegion } from "./map-filter";

type Filter = unknown[];

// Evaluated with MapLibre's own filter engine, so the rewrite is checked
// against the behaviour it has to preserve rather than against its own shape.
function evaluate(filter: Filter, feature: { type: 1 | 2 | 3; properties: Record<string, unknown> }): boolean {
  const compiled = featureFilter(filter as never, "layers[0].filter");
  return compiled.filter({ zoom: 5 } as never, { ...feature, id: 1, geometry: [[{ x: 0, y: 0 }]] } as never, { z: 5, x: 0, y: 0 } as never);
}

const FEATURES = [
  { type: 1 as const, properties: { class: "city", name: "Perth", rank: 3, capital: 4 } },
  { type: 1 as const, properties: { class: "town", name: "Broome", rank: 6 } },
  { type: 1 as const, properties: { class: "village" } },
  { type: 2 as const, properties: { class: "river", name: "Murray", rank: "x" } },
  { type: 1 as const, properties: {} },
];

const LEGACY_FILTERS: Filter[] = [
  ["==", "class", "city"],
  ["!=", "class", "city"],
  ["has", "name"],
  ["!has", "name"],
  ["in", "class", "city", "town"],
  ["!in", "class", "country", "state"],
  ["<=", "rank", 5],
  [">=", "rank", 5],
  [">", "rank", 3],
  ["==", "$type", "Point"],
  ["all", ["has", "name"], ["==", "$type", "Point"], ["in", "class", "city", "town"]],
  ["any", ["==", "class", "river"], ["<=", "rank", 3]],
  ["none", ["==", "class", "city"], ["has", "capital"]],
  ["all", [">", "capital", 0]],
];

describe("legacyFilterToExpression", () => {
  it.each(LEGACY_FILTERS.map((filter) => [JSON.stringify(filter), filter] as const))(
    "matches the legacy result for %s on every sample feature",
    (_label, filter) => {
      const expression = legacyFilterToExpression(filter);
      for (const feature of FEATURES) {
        expect(evaluate(expression, feature), JSON.stringify(feature)).toBe(evaluate(filter, feature));
      }
    },
  );

  it("leaves a filter that is already an expression unchanged", () => {
    const expression: Filter = ["==", ["get", "tier"], 1];
    expect(legacyFilterToExpression(expression)).toEqual(expression);
  });
});

describe("restrictToRegion", () => {
  const region = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };

  it("adds the region test to an existing filter", () => {
    expect(restrictToRegion(["==", "class", "city"], region)).toEqual([
      "all",
      ["==", ["get", "class"], "city"],
      ["within", region],
    ]);
  });

  it("uses the region test alone when there is no filter", () => {
    expect(restrictToRegion(undefined, region)).toEqual(["within", region]);
  });
});
