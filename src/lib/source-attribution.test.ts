import { describe, expect, it } from "vitest";
import { ExternalImportSource } from "@/generated/prisma/enums";
import { SOURCE_ATTRIBUTION, getSourceAttribution } from "./source-attribution";

describe("getSourceAttribution", () => {
  it("has a credit and licence for every import source", () => {
    for (const source of Object.values(ExternalImportSource)) {
      const attribution = SOURCE_ATTRIBUTION[source];
      expect(attribution.credit, source).not.toBe("");
      expect(attribution.licence, source).not.toBe("");
    }
  });

  it("returns nothing for a record a person mapped themselves", () => {
    expect(getSourceAttribution(null)).toBeNull();
    expect(getSourceAttribution(undefined)).toBeNull();
  });

  it("returns the matching attribution for an imported record", () => {
    expect(getSourceAttribution("act_open_data")?.credit).toContain("ACT Government");
  });

  it("only links licences to Creative Commons", () => {
    for (const attribution of Object.values(SOURCE_ATTRIBUTION)) {
      if (attribution.licenceUrl) expect(attribution.licenceUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });
});
