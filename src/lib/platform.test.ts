import { afterEach, describe, expect, it, vi } from "vitest";
import { isAndroid } from "./platform";

function setUserAgent(userAgent: string) {
  vi.stubGlobal("navigator", { userAgent });
}

describe("isAndroid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches an Android Chrome user agent", () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36");
    expect(isAndroid()).toBe(true);
  });

  it("does not match iOS", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(isAndroid()).toBe(false);
  });

  it("does not match desktop Windows or Mac", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(isAndroid()).toBe(false);
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(isAndroid()).toBe(false);
  });

  it("returns false when navigator is unavailable", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isAndroid()).toBe(false);
  });
});
