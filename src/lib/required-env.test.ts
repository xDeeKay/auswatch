import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireEnvNumber } from "./required-env";

const KEY = "REQUIRED_ENV_TEST_VALUE";

describe("requireEnvNumber", () => {
  const original = process.env[KEY];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[KEY];
    } else {
      process.env[KEY] = original;
    }
  });

  it("returns the parsed number when the variable is set", () => {
    process.env[KEY] = "42";
    expect(requireEnvNumber(KEY)).toBe(42);
  });

  it("throws when the variable is unset", () => {
    delete process.env[KEY];
    expect(() => requireEnvNumber(KEY)).toThrow(KEY);
  });

  it("throws when the variable is an empty string", () => {
    process.env[KEY] = "";
    expect(() => requireEnvNumber(KEY)).toThrow(KEY);
  });

  it("throws when the variable is not numeric", () => {
    process.env[KEY] = "not-a-number";
    expect(() => requireEnvNumber(KEY)).toThrow(KEY);
  });
});
