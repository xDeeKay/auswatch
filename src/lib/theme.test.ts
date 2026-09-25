import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, isThemePreference, nextThemePreference } from "./theme";

describe("nextThemePreference", () => {
  it("cycles auto, light, dark and back", () => {
    expect(nextThemePreference("auto")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("auto");
  });
});

describe("isThemePreference", () => {
  it("accepts only the three known values", () => {
    expect(isThemePreference("auto")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("reads the same storage key the toggle writes", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });
});
