import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { DATA_SOURCES, selectDataSourcesInUse, type DataSourceUsage } from "./data-sources";

describe("DATA_SOURCES", () => {
  it("has unique ids", () => {
    const ids = DATA_SOURCES.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never lets one dataset's reference prefix claim another's records within the same source", () => {
    for (const a of DATA_SOURCES) {
      for (const b of DATA_SOURCES) {
        if (a === b || a.source !== b.source) continue;
        expect(b.refPrefix.startsWith(a.refPrefix), `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it("links every dataset over https", () => {
    for (const source of DATA_SOURCES) expect(source.url).toMatch(/^https:\/\//);
  });
});

describe("selectDataSourcesInUse", () => {
  const [speed, distraction] = DATA_SOURCES;

  it("lists a dataset with public records, carrying its first import date and attribution", () => {
    const firstImportedAt = new Date("2026-10-05T03:00:00Z");
    const usage = new Map<string, DataSourceUsage>([[speed!.id, { firstImportedAt, publicRecords: 1087 }]]);

    const result = selectDataSourcesInUse(DATA_SOURCES, usage);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: speed!.id, firstImportedAt, publicRecords: 1087 });
    expect(result[0]!.attribution.licence).toBe("CC BY 4.0");
  });

  it("leaves out a dataset whose records are all still pending moderation", () => {
    const usage = new Map<string, DataSourceUsage>([
      [distraction!.id, { firstImportedAt: new Date("2026-10-09T00:00:00Z"), publicRecords: 0 }],
    ]);
    expect(selectDataSourcesInUse(DATA_SOURCES, usage)).toEqual([]);
  });

  it("leaves out a dataset that has never been imported", () => {
    expect(selectDataSourcesInUse(DATA_SOURCES, new Map())).toEqual([]);
  });
});
