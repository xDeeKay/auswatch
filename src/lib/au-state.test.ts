import { describe, it, expect } from "vitest";
import { deriveAuState } from "./au-state";
import { AuState } from "@/generated/prisma/enums";

describe("deriveAuState", () => {
  it.each([
    ["Sydney", -33.8688, 151.2093, AuState.nsw],
    ["Melbourne", -37.8136, 144.9631, AuState.vic],
    ["Brisbane", -27.4698, 153.0251, AuState.qld],
    ["Adelaide", -34.9285, 138.6007, AuState.sa],
    ["Perth", -31.9505, 115.8605, AuState.wa],
    ["Hobart", -42.8821, 147.3272, AuState.tas],
    ["Darwin", -12.4634, 130.8456, AuState.nt],
    ["Canberra", -35.2809, 149.13, AuState.act],
  ])("resolves %s to its state", (_name, lat, lng, expected) => {
    expect(deriveAuState({ lat, lng })).toBe(expected);
  });

  it("resolves the ACT enclave separately from the surrounding NSW territory", () => {
    expect(deriveAuState({ lat: -35.2809, lng: 149.13 })).toBe(AuState.act);
    expect(deriveAuState({ lat: -33.8688, lng: 151.2093 })).toBe(AuState.nsw);
  });

  it.each([
    ["Albury, NSW side of the Murray", -36.0737, 146.9135, AuState.nsw],
    ["Wodonga, VIC side of the Murray", -36.1241, 146.8818, AuState.vic],
    ["Coolangatta, QLD side of the border", -28.167, 153.534, AuState.qld],
    ["Broken Hill, far-west NSW", -31.954, 141.4539, AuState.nsw],
    ["Mildura, VIC", -34.1855, 142.1625, AuState.vic],
  ])("resolves border town %s correctly", (_name, lat, lng, expected) => {
    expect(deriveAuState({ lat, lng })).toBe(expected);
  });

  it("resolves Kangaroo Island (SA) as a secondary landmass, not just the mainland", () => {
    expect(deriveAuState({ lat: -35.6543, lng: 137.6377 })).toBe(AuState.sa);
  });

  it("resolves Tasmania's main island, not just a bounding box guess", () => {
    expect(deriveAuState({ lat: -41.1795, lng: 146.3467 })).toBe(AuState.tas);
  });

  it("fails closed to null for a point in open ocean", () => {
    expect(deriveAuState({ lat: -40, lng: 160 })).toBeNull();
  });

  it("fails closed to null for an external territory not covered by the dataset", () => {
    expect(deriveAuState({ lat: -29.0408, lng: 167.9547 })).toBeNull();
  });

  it("does not throw and fails closed on a tight, imprecise border point", () => {
    expect(() => deriveAuState({ lat: -28.177, lng: 153.549 })).not.toThrow();
  });
});
