import { describe, it, expect } from "vitest";
import { parsePageParams, paginate } from "./pagination";

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

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("returns the first page by default", () => {
    const result = paginate(items, { page: 1, pageSize: 10 });
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toMatchObject({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
  });

  it("returns a middle page", () => {
    const result = paginate(items, { page: 2, pageSize: 10 });
    expect(result.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("returns a partial final page", () => {
    const result = paginate(items, { page: 3, pageSize: 10 });
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps a page number beyond the last page down to the last page", () => {
    const result = paginate(items, { page: 99, pageSize: 10 });
    expect(result.page).toBe(3);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps a page number below 1 up to 1", () => {
    const result = paginate(items, { page: 0, pageSize: 10 });
    expect(result.page).toBe(1);
  });

  it("returns an empty page with totalPages 1 for an empty list, never dividing by zero or crashing", () => {
    const result = paginate([], { page: 1, pageSize: 10 });
    expect(result).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 });
  });
});
