import { afterEach, describe, expect, it, vi } from "vitest";
import { isIOS } from "./platform";

function setNavigator(overrides: Partial<Navigator> & { standalone?: unknown }) {
  vi.stubGlobal("navigator", { userAgent: "", platform: "", maxTouchPoints: 0, ...overrides });
}

describe("isIOS", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches an iPhone or iPod user agent", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
    expect(isIOS()).toBe(true);
  });

  it("matches an iPad requesting the mobile Safari UA", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" });
    expect(isIOS()).toBe(true);
  });

  it("matches an iPad requesting the desktop UA (reports as MacIntel with multi-touch)", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5 });
    expect(isIOS()).toBe(true);
  });

  it("does not match a real Mac, which has no touch points", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 });
    expect(isIOS()).toBe(false);
  });

  it("matches whenever navigator.standalone is defined, regardless of the UA", () => {
    setNavigator({ userAgent: "something else entirely", standalone: false });
    expect(isIOS()).toBe(true);
  });

  it("does not match Android", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)", platform: "Linux armv8l", maxTouchPoints: 5 });
    expect(isIOS()).toBe(false);
  });

  it("does not match desktop Windows Chrome", () => {
    setNavigator({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32", maxTouchPoints: 0 });
    expect(isIOS()).toBe(false);
  });

  it("returns false when navigator is unavailable", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isIOS()).toBe(false);
  });
});
