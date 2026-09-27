import { describe, expect, it } from "vitest";
import { extractSharedBorders, simplifyLine, type Ring } from "./state-borders";

const OPTIONS = { toleranceMetres: 15, simplifyMetres: 6, minLengthMetres: 1000 };

// Two squares side by side along a shared meridian, each with its own
// coastline on the other three sides.
const WEST: Ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
const EAST: Ring = [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]];
const ISOLATED: Ring = [[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]];

describe("extractSharedBorders", () => {
  it("returns only the edge two states share, not their coastlines", () => {
    const lines = extractSharedBorders({ a: [WEST], b: [EAST] }, OPTIONS);
    expect(lines).toHaveLength(1);
    const xs = lines[0].coords.map(([x]) => x);
    expect(new Set(xs)).toEqual(new Set([1]));
    const ys = lines[0].coords.map(([, y]) => y);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(1);
  });

  it("names the pair, and reports each border once", () => {
    const lines = extractSharedBorders({ b: [EAST], a: [WEST] }, OPTIONS);
    expect(lines.map(({ a, b }) => `${a}/${b}`)).toEqual(["a/b"]);
  });

  it("finds nothing for states that do not touch", () => {
    expect(extractSharedBorders({ a: [WEST], c: [ISOLATED] }, OPTIONS)).toEqual([]);
  });

  it("matches an edge whose vertices differ slightly between the two polygons", () => {
    // About 5m off in longitude at the equator, as two separately simplified
    // boundaries would be.
    const eastNudged: Ring = [[1.00004, 0], [2, 0], [2, 1], [1.00004, 1], [1.00004, 0]];
    const lines = extractSharedBorders({ a: [WEST], b: [eastNudged] }, OPTIONS);
    expect(lines).toHaveLength(1);
  });

  it("does not match an edge that is well away from the other polygon", () => {
    const eastApart: Ring = [[1.01, 0], [2, 0], [2, 1], [1.01, 1], [1.01, 0]];
    expect(extractSharedBorders({ a: [WEST], b: [eastApart] }, OPTIONS)).toEqual([]);
  });

  it("drops a shared run shorter than the minimum length", () => {
    // The squares touch along only a 0.001 degree (about 110 m) stretch.
    const west: Ring = [[0, 0], [1, 0], [1, 0.001], [0, 0.001], [0, 0]];
    const east: Ring = [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]];
    expect(extractSharedBorders({ a: [west], b: [east] }, OPTIONS)).toEqual([]);
  });

  it("returns a closed loop for an enclave whose whole boundary is shared", () => {
    const outer: Ring = [[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]];
    const enclave: Ring = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]];
    const lines = extractSharedBorders({ outer: [outer, enclave], inner: [enclave] }, OPTIONS);
    const loop = lines.find((line) => line.a === "inner" || line.b === "inner");
    expect(loop).toBeDefined();
    expect(loop!.coords[0]).toEqual(loop!.coords[loop!.coords.length - 1]);
  });
});

describe("simplifyLine", () => {
  it("drops points that lie on a straight line", () => {
    const line: [number, number][] = [[0, 0], [0.5, 0], [1, 0]];
    expect(simplifyLine(line, 5)).toEqual([[0, 0], [1, 0]]);
  });

  it("keeps a point that deviates by more than the tolerance", () => {
    const line: [number, number][] = [[0, 0], [0.5, 0.001], [1, 0]];
    expect(simplifyLine(line, 5)).toHaveLength(3);
  });

  it("always keeps the two ends", () => {
    const line: [number, number][] = [[0, 0], [1, 0.00001], [2, 0]];
    const result = simplifyLine(line, 50);
    expect(result[0]).toEqual([0, 0]);
    expect(result[result.length - 1]).toEqual([2, 0]);
  });
});
