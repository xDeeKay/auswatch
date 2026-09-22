import { describe, it, expect, vi, beforeEach } from "vitest";
import { SensitiveZoneCategory } from "@/generated/prisma/enums";

const fetchOsmFeaturesInBboxMock = vi.fn();
vi.mock("@/lib/sensitive-site-check", () => ({
  fetchOsmFeaturesInBbox: (...args: unknown[]) => fetchOsmFeaturesInBboxMock(...args),
}));

const deleteManyMock = vi.fn();
const createManyMock = vi.fn();
const transactionMock = vi.fn((ops: unknown[]) => Promise.all(ops));

vi.mock("@/lib/db", () => ({
  prisma: {
    sensitiveSiteOsmCache: {
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
      createMany: (...args: unknown[]) => createManyMock(...args),
    },
    $transaction: (arg: unknown[]) => transactionMock(arg),
  },
}));

const { refreshSensitiveSiteOsmCache } = await import("./sensitive-site-cache-refresh");

describe("refreshSensitiveSiteOsmCache", () => {
  beforeEach(() => {
    fetchOsmFeaturesInBboxMock.mockReset();
    deleteManyMock.mockReset().mockResolvedValue({ count: 0 });
    createManyMock.mockReset().mockResolvedValue({ count: 0 });
    transactionMock.mockClear();
  });

  it("replaces the cache with a fresh fetch, sharing one refreshedAt across every row", async () => {
    fetchOsmFeaturesInBboxMock.mockResolvedValue([
      { lat: -31.95, lng: 115.86, category: SensitiveZoneCategory.school, detail: "school" },
      { lat: -33.87, lng: 151.21, category: SensitiveZoneCategory.military, detail: "base" },
    ]);

    const result = await refreshSensitiveSiteOsmCache();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.featureCount).toBe(2);

    expect(deleteManyMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const createArgs = createManyMock.mock.calls[0]![0] as { data: Array<{ refreshedAt: Date }> };
    expect(createArgs.data).toHaveLength(2);
    expect(createArgs.data[0]!.refreshedAt).toEqual(createArgs.data[1]!.refreshedAt);
    expect(createArgs.data[0]!.refreshedAt).toEqual(result.refreshedAt);
  });

  it("leaves the existing cache untouched and returns an error when the fetch fails", async () => {
    fetchOsmFeaturesInBboxMock.mockRejectedValue(new Error("Overpass bounding-box query failed: 504"));

    const result = await refreshSensitiveSiteOsmCache();

    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("unreachable");
    expect(result.message).toMatch(/504/);
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
  });
});
