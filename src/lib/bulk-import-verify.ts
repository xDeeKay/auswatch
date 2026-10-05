import type { Prisma } from "@/generated/prisma/client";
import { ExternalImportSource, ModerationState } from "@/generated/prisma/enums";

export const BULK_VERIFY_BATCH_SIZE = 250;

export const BULK_VERIFY_NOTE = "Confirmed against the official open dataset this record was imported from.";

export function parseImportSource(value: unknown): ExternalImportSource | null {
  if (typeof value !== "string") return null;
  const sources: string[] = Object.values(ExternalImportSource);
  return sources.includes(value) ? (value as ExternalImportSource) : null;
}

export function cleanImportWhere(source: ExternalImportSource): Prisma.CameraWhereInput {
  return {
    externalSource: source,
    moderationState: ModerationState.pending,
    sensitiveSiteMatches: { none: {} },
  };
}
