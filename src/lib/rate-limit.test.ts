import { describe, it, expect } from "vitest";
import { evaluateRateLimit } from "./rate-limit";

const limits = { maxPerSignal: 3, maxGlobal: 11 };

describe("evaluateRateLimit", () => {
  it("allows when under both limits", () => {
    const result = evaluateRateLimit({ signalCount: 1, globalCount: 5 }, limits);
    expect(result).toEqual({ allowed: true });
  });

  it("blocks with scope 'signal' when over the per-signal limit only", () => {
    const result = evaluateRateLimit({ signalCount: 3, globalCount: 5 }, limits);
    expect(result).toEqual({ allowed: false, scope: "signal" });
  });

  it("blocks with scope 'global' when over the global limit", () => {
    const result = evaluateRateLimit({ signalCount: 1, globalCount: 11 }, limits);
    expect(result).toEqual({ allowed: false, scope: "global" });
  });

  it("prefers 'global' scope when both limits are exceeded", () => {
    const result = evaluateRateLimit({ signalCount: 5, globalCount: 20 }, limits);
    expect(result).toEqual({ allowed: false, scope: "global" });
  });

  it("treats the limit as inclusive (count === max blocks)", () => {
    const result = evaluateRateLimit({ signalCount: 2, globalCount: 10 }, limits);
    expect(result).toEqual({ allowed: true });
  });
});
