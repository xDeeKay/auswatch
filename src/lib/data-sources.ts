import { prisma } from "@/lib/db";
import { ExternalImportSource, ModerationState } from "@/generated/prisma/enums";
import { SOURCE_ATTRIBUTION, type SourceAttribution } from "@/lib/source-attribution";

// One import source (a government portal) can supply several datasets. Each
// dataset's records are told apart by the prefix on their externalRef, so the
// prefixes within one source must never overlap.
export type DataSource = {
  id: string;
  name: string;
  publisher: string;
  url: string;
  source: ExternalImportSource;
  refPrefix: string;
};

export const DATA_SOURCES: DataSource[] = [
  {
    id: "act-traffic-speed-cameras",
    name: "Traffic speed camera locations",
    publisher: "Access Canberra",
    url: "https://www.data.act.gov.au/Transport/Traffic-speed-camera-locations/426s-vdu4",
    source: ExternalImportSource.act_open_data,
    refPrefix: "row-",
  },
  {
    id: "act-mobile-distraction-cameras",
    name: "Mobile Distraction - Fixed and Transportable camera locations",
    publisher: "Access Canberra",
    url: "https://www.data.act.gov.au/Transport/Mobile-Distraction-Fixed-and-Transportable-camera-/5ezj-yjxz",
    source: ExternalImportSource.act_open_data,
    refPrefix: "5ezj-yjxz:",
  },
];

export type DataSourceUsage = {
  firstImportedAt: Date | null;
  publicRecords: number;
};

export type DataSourceInUse = DataSource & {
  attribution: SourceAttribution;
  firstImportedAt: Date;
  publicRecords: number;
};

// A dataset is listed only once at least one of its records is public, so an
// import still waiting in the moderation queue is never advertised.
export function selectDataSourcesInUse(
  sources: DataSource[],
  usage: Map<string, DataSourceUsage>
): DataSourceInUse[] {
  return sources.flatMap((source) => {
    const stats = usage.get(source.id);
    if (!stats || stats.publicRecords === 0 || !stats.firstImportedAt) return [];
    return [
      {
        ...source,
        attribution: SOURCE_ATTRIBUTION[source.source],
        firstImportedAt: stats.firstImportedAt,
        publicRecords: stats.publicRecords,
      },
    ];
  });
}

export async function getDataSourcesInUse(): Promise<DataSourceInUse[]> {
  const usage = new Map<string, DataSourceUsage>();

  // Public records only, so nothing about records still awaiting review,
  // not even when they arrived, reaches this page.
  await Promise.all(
    DATA_SOURCES.map(async (source) => {
      const result = await prisma.camera.aggregate({
        where: {
          externalSource: source.source,
          externalRef: { startsWith: source.refPrefix },
          moderationState: ModerationState.verified,
        },
        _min: { createdAt: true },
        _count: { _all: true },
      });
      usage.set(source.id, { firstImportedAt: result._min.createdAt, publicRecords: result._count._all });
    })
  );

  return selectDataSourcesInUse(DATA_SOURCES, usage);
}
