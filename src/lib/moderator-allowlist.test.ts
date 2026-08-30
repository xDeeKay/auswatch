import { describe, it, expect } from "vitest";
import { isModeratorEmail } from "./moderator-allowlist";

describe("isModeratorEmail", () => {
  const allowlist = "alice@example.com, Bob@Example.com ,carol@example.com";

  it("allows an exact match", () => {
    expect(isModeratorEmail("alice@example.com", allowlist)).toBe(true);
  });

  it("allows a case-insensitive match", () => {
    expect(isModeratorEmail("BOB@example.com", allowlist)).toBe(true);
  });

  it("handles whitespace-padded allowlist entries", () => {
    expect(isModeratorEmail("carol@example.com", allowlist)).toBe(true);
  });

  it("rejects an email not in the list", () => {
    expect(isModeratorEmail("mallory@example.com", allowlist)).toBe(false);
  });

  it("rejects a null email", () => {
    expect(isModeratorEmail(null, allowlist)).toBe(false);
  });

  it("rejects an undefined email", () => {
    expect(isModeratorEmail(undefined, allowlist)).toBe(false);
  });

  it("rejects everyone when the allowlist is unset", () => {
    expect(isModeratorEmail("alice@example.com", undefined)).toBe(false);
  });

  it("rejects everyone when the allowlist is empty", () => {
    expect(isModeratorEmail("alice@example.com", "")).toBe(false);
  });
});
