import { describe, expect, it } from "vitest";
import { getStreetViewUrl } from "./street-view";

describe("getStreetViewUrl", () => {
  it("builds a Street View link for the coordinate", () => {
    expect(getStreetViewUrl(-33.8688, 151.2093)).toBe(
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-33.868800,151.209300",
    );
  });
});
