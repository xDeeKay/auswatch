import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, isThemePreference, nextThemePreference, resolveTheme } from "./theme";

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

describe("resolveTheme", () => {
  it("lets an explicit data-theme override the OS preference", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the OS preference when no theme is set (auto)", () => {
    expect(resolveTheme(null, true)).toBe("light");
    expect(resolveTheme(null, false)).toBe("dark");
  });

  it("ignores an unrecognised data-theme value", () => {
    expect(resolveTheme("sepia", true)).toBe("light");
    expect(resolveTheme("sepia", false)).toBe("dark");
  });
});
