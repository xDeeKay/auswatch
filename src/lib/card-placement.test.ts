import { describe, expect, it } from "vitest";
import { placeCard, type PlacementOptions } from "./card-placement";

const options: PlacementOptions = { gap: 14, margin: 12, topInset: 60, arrowInset: 16 };
const container = { width: 800, height: 600 };
const card = { width: 288, height: 200 };

describe("placeCard", () => {
  it("centres the card above a marker in open space", () => {
    const placement = placeCard({ x: 400, y: 400 }, card, container, options);
    expect(placement.left).toBe(256);
    expect(placement.top).toBe(186);
    expect(placement.arrowX).toBe(144);
    expect(placement.pan).toEqual({ x: 0, y: 0 });
    expect(placement.markerVisible).toBe(true);
  });

  it("clamps to the left edge and slides the arrow to keep pointing at the marker", () => {
    const placement = placeCard({ x: 40, y: 400 }, card, container, options);
    expect(placement.left).toBe(12);
    expect(placement.arrowX).toBe(28);
  });

  it("clamps to the right edge", () => {
    const placement = placeCard({ x: 780, y: 400 }, card, container, options);
    expect(placement.left).toBe(500);
    expect(placement.arrowX).toBe(272);
  });

  it("keeps the arrow off the card corners when the marker is far outside the card", () => {
    const placement = placeCard({ x: 5, y: 400 }, card, container, options);
    expect(placement.arrowX).toBe(16);
  });

  it("asks to pan down when the card would overflow the top edge", () => {
    const placement = placeCard({ x: 400, y: 100 }, card, container, options);
    expect(placement.top).toBe(-114);
    expect(placement.pan).toEqual({ x: 0, y: -174 });
  });

  it("asks to pan horizontally when the card would overflow a side edge", () => {
    expect(placeCard({ x: 40, y: 400 }, card, container, options).pan).toEqual({ x: -(12 - (40 - 144)), y: 0 });
    expect(placeCard({ x: 780, y: 400 }, card, container, options).pan.x).toBeGreaterThan(0);
  });

  it("reports a marker outside the container as not visible", () => {
    expect(placeCard({ x: -5, y: 300 }, card, container, options).markerVisible).toBe(false);
    expect(placeCard({ x: 400, y: 700 }, card, container, options).markerVisible).toBe(false);
  });

  it("pins to the left margin when the card is wider than the container", () => {
    const placement = placeCard({ x: 100, y: 400 }, { width: 400, height: 200 }, { width: 300, height: 600 }, options);
    expect(placement.left).toBe(12);
  });
});
