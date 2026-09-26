import { describe, expect, it } from "vitest";
import { parseBasemapView, toggleBasemapView } from "./basemap-view";

describe("basemap view", () => {
  it("defaults to the map for anything but the satellite value", () => {
    expect(parseBasemapView("satellite")).toBe("satellite");
    expect(parseBasemapView("map")).toBe("map");
    expect(parseBasemapView(null)).toBe("map");
    expect(parseBasemapView("hybrid")).toBe("map");
  });

  it("toggles between the two views", () => {
    expect(toggleBasemapView("map")).toBe("satellite");
    expect(toggleBasemapView("satellite")).toBe("map");
  });
});
