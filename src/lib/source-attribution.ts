import type { ExternalImportSource } from "@/generated/prisma/enums";

export type SourceAttribution = {
  credit: string;
  licence: string;
  licenceUrl?: string;
};

const CC_BY_4_URL = "https://creativecommons.org/licenses/by/4.0/";

export const SOURCE_ATTRIBUTION: Record<ExternalImportSource, SourceAttribution> = {
  act_open_data: { credit: "ACT Government open data (Access Canberra)", licence: "CC BY 4.0", licenceUrl: CC_BY_4_URL },
  vic_open_data: { credit: "Victorian Government open data", licence: "CC BY 4.0", licenceUrl: CC_BY_4_URL },
  nsw_open_data: { credit: "NSW Government open data", licence: "CC BY" },
  qld_open_data: { credit: "Queensland Government open data", licence: "CC BY 4.0", licenceUrl: CC_BY_4_URL },
};

// Read from the record's source at display time, never from its editable
// notes, so an approved correction cannot remove the credit.
export function getSourceAttribution(source: ExternalImportSource | null | undefined): SourceAttribution | null {
  return source ? SOURCE_ATTRIBUTION[source] : null;
}
