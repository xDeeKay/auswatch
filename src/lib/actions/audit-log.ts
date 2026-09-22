"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AuditActionType, ModeratorRole, HistoryEventType, CorrectionReportStatus } from "@/generated/prisma/enums";
import { requireAdmin, accessDeniedMessage, countOtherActiveAdmins } from "@/lib/moderator-access";
import { assertRevertable, buildRevertAuditEntry } from "@/lib/audit-log-revert";
import { toJsonInput, pickCameraFields } from "@/lib/audit-log-payloads";
import { diffGrants } from "@/lib/moderator-grants";
import type {
  CameraLifecyclePayload,
  CameraStateOverridePayload,
  CameraFieldsPayload,
  CorrectionStatusPayload,
  ModeratorProfilePayload,
  ModeratorActivePayload,
} from "@/lib/audit-log-payloads";

export type AuditLogActionResult = { status: "ok" } | { status: "error"; message: string };

function parseDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

export async function revertAuditLogEntry(entryId: string): Promise<AuditLogActionResult> {
  const access = await requireAdmin();
  if (access.status !== "ok") {
    return { status: "error", message: accessDeniedMessage(access) };
  }
  const actorId = access.profile.userId;
  if (!actorId) {
    return { status: "error", message: "Not authenticated." };
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const entry = await tx.auditLogEntry.findUnique({ where: { id: entryId } });
      if (!entry) {
        return { ok: false as const, message: "This history entry no longer exists." };
      }

      const head = await tx.auditLogEntry.findFirst({
        where: { entityType: entry.entityType, entityId: entry.entityId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const check = assertRevertable(entry, head?.id ?? entry.id);
      if (!check.ok) {
        return { ok: false as const, message: check.message };
      }

      const restore = await restoreEntry(tx, entry, actorId);
      if (!restore.ok) {
        return { ok: false as const, message: restore.message };
      }

      const revertUpdate = await tx.auditLogEntry.updateMany({
        where: { id: entry.id, revertedAt: null },
        data: { revertedAt: new Date(), revertedByUserId: actorId },
      });
      if (revertUpdate.count === 0) {
        return { ok: false as const, message: "This action has already been reverted." };
      }

      const revertPlan = buildRevertAuditEntry(entry, actorId);
      await tx.auditLogEntry.create({
        data: { ...revertPlan, before: toJsonInput(revertPlan.before), after: toJsonInput(revertPlan.after) },
      });

      return { ok: true as const, entityType: entry.entityType, entityId: entry.entityId };
    });

    if (!outcome.ok) {
      return { status: "error", message: outcome.message };
    }

    revalidatePath("/admin/audit-log");
    if (outcome.entityType === "camera") {
      revalidatePath(`/moderate/cameras/${outcome.entityId}`);
      revalidatePath("/moderate");
    } else if (outcome.entityType === "moderator_profile") {
      revalidatePath("/admin/moderators");
      revalidatePath(`/admin/moderators/${outcome.entityId}/edit`);
    }
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

type RestoreResult = { ok: true } | { ok: false; message: string };

type TxClient = Prisma.TransactionClient;

async function restoreEntry(
  tx: TxClient,
  entry: { entityType: string; entityId: string; action: string; before: unknown; after: unknown },
  actorId: string
): Promise<RestoreResult> {
  switch (entry.action) {
    case AuditActionType.camera_verify:
    case AuditActionType.camera_remove: {
      const before = entry.before as CameraLifecyclePayload;
      await tx.camera.update({
        where: { id: entry.entityId },
        data: { moderationState: before.moderationState, status: before.status },
      });
      await tx.historyEvent.create({
        data: {
          cameraId: entry.entityId,
          date: new Date(),
          eventType: HistoryEventType.corrected,
          note: "Reverted by an admin: moderation decision undone.",
        },
      });
      return { ok: true };
    }

    case AuditActionType.camera_state_override: {
      const before = entry.before as CameraStateOverridePayload;
      await tx.camera.update({
        where: { id: entry.entityId },
        data: { state: before.state, stateOverride: before.stateOverride },
      });
      await tx.historyEvent.create({
        data: {
          cameraId: entry.entityId,
          date: new Date(),
          eventType: HistoryEventType.corrected,
          note: "Reverted by an admin: state override undone.",
        },
      });
      return { ok: true };
    }

    case AuditActionType.camera_correction_approve: {
      const before = pickCameraFields(entry.before);
      // correctionReportId (and createdSensitiveSiteMatchIds) are extra
      // bookkeeping keys spliced onto the ORIGINAL approve's `after` only
      // (see pickCameraFields) - `before` never carries them. Reverting the
      // original approve (an undo) reads the id off entry.after as usual.
      // Reverting a *revert* of one (a redo) sees before/after swapped
      // wholesale, so the very same id shows up in entry.before instead -
      // check both sides rather than assuming a direction, and use whichever
      // side it's actually on to tell the two cases apart.
      const beforeRaw = entry.before as Record<string, unknown> | null;
      const afterRaw = entry.after as CameraFieldsPayload & { correctionReportId?: string };
      const isUndo = typeof afterRaw.correctionReportId === "string";
      const correctionReportId = isUndo
        ? afterRaw.correctionReportId
        : (beforeRaw?.correctionReportId as string | undefined);

      await tx.camera.update({ where: { id: entry.entityId }, data: before });
      await tx.historyEvent.create({
        data: {
          cameraId: entry.entityId,
          date: new Date(),
          eventType: HistoryEventType.corrected,
          note: isUndo
            ? "Reverted by an admin: correction approval undone."
            : "Reverted by an admin: correction approval redone.",
        },
      });
      if (correctionReportId) {
        await tx.correctionReport.updateMany({
          where: { id: correctionReportId },
          data: isUndo
            ? // Put back to pending so it can be re-reviewed, since its
              // approval is no longer reflected on the camera.
              { status: CorrectionReportStatus.pending, reviewedAt: null }
            : // Redo: the approval is live on the camera again.
              { status: CorrectionReportStatus.approved, reviewedAt: new Date() },
        });
      }
      return { ok: true };
    }

    case AuditActionType.camera_correction_reject: {
      const before = entry.before as CorrectionStatusPayload;
      await tx.correctionReport.update({
        where: { id: entry.entityId },
        data: { status: before.status, reviewedAt: parseDate(before.reviewedAt) },
      });
      return { ok: true };
    }

    case AuditActionType.camera_note_add: {
      await tx.cameraNote.update({ where: { id: entry.entityId }, data: { deletedAt: new Date() } });
      return { ok: true };
    }

    case AuditActionType.moderator_create: {
      const isLastAdmin = await wouldRemoveLastActiveAdmin(tx, entry.entityId);
      if (isLastAdmin) {
        return { ok: false, message: "Can't undo adding the last remaining active admin." };
      }
      await tx.moderatorProfile.update({
        where: { id: entry.entityId },
        data: { isActive: false, deactivatedAt: new Date(), lastEditedByUserId: actorId },
      });
      return { ok: true };
    }

    case AuditActionType.moderator_update: {
      const before = entry.before as ModeratorProfilePayload;
      if (before.role !== ModeratorRole.admin) {
        const isLastAdmin = await wouldRemoveLastActiveAdmin(tx, entry.entityId);
        if (isLastAdmin) {
          return { ok: false, message: "Can't undo this change: it would remove the last remaining active admin." };
        }
      }
      const current = await tx.moderatorProfile.findUnique({
        where: { id: entry.entityId },
        include: { grants: true },
      });
      if (!current) {
        return { ok: false, message: "This moderator profile no longer exists." };
      }
      const diff = diffGrants(current.grants, before.role === ModeratorRole.admin ? [] : before.grants);
      await tx.moderatorProfile.update({
        where: { id: entry.entityId },
        data: { role: before.role, lastEditedByUserId: actorId },
      });
      if (diff.toDeleteIds.length > 0) {
        await tx.moderatorGrant.deleteMany({ where: { id: { in: diff.toDeleteIds } } });
      }
      for (const g of diff.toUpdate) {
        await tx.moderatorGrant.update({ where: { id: g.id }, data: { canView: g.canView, canAct: g.canAct } });
      }
      if (diff.toCreate.length > 0) {
        await tx.moderatorGrant.createMany({
          data: diff.toCreate.map((g) => ({ ...g, moderatorProfileId: entry.entityId })),
        });
      }
      return { ok: true };
    }

    case AuditActionType.moderator_deactivate: {
      await tx.moderatorProfile.update({
        where: { id: entry.entityId },
        data: { isActive: true, deactivatedAt: null, lastEditedByUserId: actorId },
      });
      return { ok: true };
    }

    case AuditActionType.moderator_reactivate: {
      const before = entry.before as ModeratorActivePayload;
      const isLastAdmin = await wouldRemoveLastActiveAdmin(tx, entry.entityId);
      if (isLastAdmin) {
        return { ok: false, message: "Can't undo this reactivation: it would remove the last remaining active admin." };
      }
      await tx.moderatorProfile.update({
        where: { id: entry.entityId },
        data: { isActive: false, deactivatedAt: parseDate(before.deactivatedAt), lastEditedByUserId: actorId },
      });
      return { ok: true };
    }

    default:
      return { ok: false, message: "This action type can't be reverted." };
  }
}

/** True if the given profile is currently the sole active admin, i.e. deactivating it would leave zero. */
async function wouldRemoveLastActiveAdmin(tx: TxClient, profileId: string): Promise<boolean> {
  const profile = await tx.moderatorProfile.findUnique({ where: { id: profileId } });
  if (!profile || profile.role !== ModeratorRole.admin || !profile.isActive) {
    return false;
  }
  const others = await countOtherActiveAdmins(profileId);
  return others === 0;
}
