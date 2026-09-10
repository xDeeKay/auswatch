import type { ValidatedSubmission } from "@/lib/validation/submission";
import type { Prisma } from "@/generated/prisma/client";
import { deriveAuState } from "@/lib/au-state";

export function buildCameraCreateData(
  input: ValidatedSubmission,
  reporterToken: string
): Prisma.CameraCreateInput {
  return {
    lat: input.lat,
    lng: input.lng,
    type: input.type,
    operator: input.operator,
    captures: input.captures,
    notes: input.notes,
    reporterId: reporterToken,
    state: deriveAuState({ lat: input.lat, lng: input.lng }),
  };
}
