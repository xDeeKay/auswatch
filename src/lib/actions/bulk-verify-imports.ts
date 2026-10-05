"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  CameraStatus,
  ModerationReasonCode,
  ModerationState,
  type ExternalImportSource,
} from "@/generated/prisma/enums";
import { buildVerifyTransition } from "@/lib/moderation-transition";
import { requireAdmin, accessDeniedMessage } from "@/lib/moderator-access";
import { checkSensitiveSite } from "@/lib/sensitive-site-check";
import {
  BULK_VERIFY_BATCH_SIZE,
  BULK_VERIFY_NOTE,
  cleanImportWhere,
  parseImportSource,
} from "@/lib/bulk-import-verify";

export type BulkVerifyResult =
  | { status: "ok"; verified: number; flagged: number; unchecked: number; skipped: number }
  | { status: "error"; message: string };

type AdminActor = { actorId: string } | { error: string };

async function resolveAdminActor(): Promise<AdminActor> {
  const access = await requireAdmin();
  if (access.status !== "ok") return { error: accessDeniedMessage(access) };
  if (!access.profile.userId) return { error: "Not authenticated." };
  return { actorId: access.profile.userId };
}

/**
 * Verifies one pending import, guarded on the write itself so a record that
 * changed after it was selected is skipped rather than overwritten.
 */
async function verifyImportedCamera(
  camera: { id: string; status: CameraStatus },
  source: ExternalImportSource,
  actorId: string,
  reasonCode: ModerationReasonCode,
  note: string,
  extraWhere: Prisma.CameraWhereInput = {}
): Promise<"verified" | "skipped"> {
  return prisma.$transaction(async (tx) => {
    const plan = buildVerifyTransition({
      cameraId: camera.id,
      actorId,
      reasonCode,
      note,
      statusBefore: camera.status,
      moderationActionId: randomUUID(),
    });

    const result = await tx.camera.updateMany({
      where: { id: camera.id, ...extraWhere, externalSource: source, moderationState: ModerationState.pending },
      data: plan.cameraUpdate,
    });
    if (result.count === 0) return "skipped" as const;

    if (plan.historyEvent) await tx.historyEvent.create({ data: plan.historyEvent });
    await tx.moderationAction.create({ data: plan.moderationAction });
    await tx.auditLogEntry.create({ data: plan.auditLogEntry });
    return "verified" as const;
  });
}

/**
 * Verifies a batch of imported records that came in clean, re-running the
 * sensitive-site check against current data first so a zone added since the
 * import still holds a record back. Fails closed: a record whose check errors
 * or matches is left pending for individual review, never verified.
 */
export async function bulkVerifyCleanImports(sourceValue: string): Promise<BulkVerifyResult> {
  const source = parseImportSource(sourceValue);
  if (!source) return { status: "error", message: "Unknown import source." };

  try {
    const actor = await resolveAdminActor();
    if ("error" in actor) return { status: "error", message: actor.error };

    const candidates = await prisma.camera.findMany({
      where: cleanImportWhere(source),
      orderBy: { id: "asc" },
      take: BULK_VERIFY_BATCH_SIZE,
      select: { id: true, lat: true, lng: true, status: true },
    });

    let verified = 0;
    let flagged = 0;
    let unchecked = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      let check;
      try {
        check = await checkSensitiveSite({ lat: candidate.lat, lng: candidate.lng });
      } catch {
        unchecked++;
        continue;
      }

      if (check.checkErrors.length > 0) {
        unchecked++;
        continue;
      }

      if (check.matches.length > 0) {
        await prisma.sensitiveSiteMatch.createMany({
          data: check.matches.map((m) => ({
            cameraId: candidate.id,
            source: m.source,
            category: m.category,
            zoneId: m.zoneId,
            distanceMeters: m.distanceMeters,
            lat: m.lat,
            lng: m.lng,
            detail: m.detail,
          })),
        });
        flagged++;
        continue;
      }

      const outcome = await verifyImportedCamera(
        candidate,
        source,
        actor.actorId,
        ModerationReasonCode.official_dataset,
        BULK_VERIFY_NOTE,
        { sensitiveSiteMatches: { none: {} } }
      );
      if (outcome === "verified") verified++;
      else skipped++;
    }

    revalidatePath("/moderate");
    revalidatePath("/admin/imports");
    return { status: "ok", verified, flagged, unchecked, skipped };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
