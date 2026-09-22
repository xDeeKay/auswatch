import { describe, it, expect } from "vitest";
import { parsePageParams } from "./pagination";

describe("parsePageParams", () => {
  const options = { defaultPageSize: 20, maxPageSize: 100 };

  it("defaults page to 1 and pageSize to the default when unset", () => {
    expect(parsePageParams({}, options)).toEqual({ page: 1, pageSize: 20 });
  });

  it("parses valid page and pageSize values", () => {
    expect(parsePageParams({ page: "3", pageSize: "50" }, options)).toEqual({ page: 3, pageSize: 50 });
  });

  it("clamps pageSize to the maximum", () => {
    expect(parsePageParams({ pageSize: "9999" }, options)).toEqual({ page: 1, pageSize: 100 });
  });

  it.each(["0", "-1", "abc", "1.5", ""])("falls back to page 1 for invalid page %s", (value) => {
    expect(parsePageParams({ page: value }, options).page).toBe(1);
  });

  it.each(["0", "-5", "abc", "2.5"])("falls back to the default pageSize for invalid pageSize %s", (value) => {
    expect(parsePageParams({ pageSize: value }, options).pageSize).toBe(20);
  });
});
