"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ModeratorRole } from "@/generated/prisma/enums";
import {
  requireAdmin,
  normalizeModeratorEmail,
  accessDeniedMessage,
  countOtherActiveAdmins,
} from "@/lib/moderator-access";
import { parseGrantGrid, diffGrants } from "@/lib/moderator-grants";
import { toJsonInput } from "@/lib/audit-log-payloads";
import {
  toGrantCells,
  buildModeratorCreateAuditEntry,
  buildModeratorUpdateAuditEntry,
  buildModeratorDeactivateAuditEntry,
  buildModeratorReactivateAuditEntry,
} from "@/lib/moderator-audit";

export type AdminActionResult = { status: "ok" } | { status: "error"; message: string };

function parseRole(value: FormDataEntryValue | null): ModeratorRole {
  return value === ModeratorRole.admin ? ModeratorRole.admin : ModeratorRole.moderator;
}

export async function createModeratorProfile(formData: FormData): Promise<AdminActionResult> {
  const access = await requireAdmin();
  if (access.status !== "ok") {
    return { status: "error", message: accessDeniedMessage(access) };
  }
  const actorId = access.profile.userId;
  if (!actorId) {
    return { status: "error", message: "Not authenticated." };
  }

  const emailRaw = formData.get("email");
  if (typeof emailRaw !== "string" || !emailRaw.trim()) {
    return { status: "error", message: "Email is required." };
  }
  const email = normalizeModeratorEmail(emailRaw);
  const role = parseRole(formData.get("role"));
  const grants = role === ModeratorRole.moderator ? parseGrantGrid(formData) : [];

  try {
    const existing = await prisma.moderatorProfile.findUnique({ where: { email } });
    if (existing) {
      return { status: "error", message: "A moderator profile with this email already exists." };
    }

    const profileId = randomUUID();
    const auditEntry = buildModeratorCreateAuditEntry(profileId, actorId, email, role, grants);

    await prisma.$transaction([
      prisma.moderatorProfile.create({
        data: {
          id: profileId,
          email,
          role,
          lastEditedByUserId: actorId,
          grants: { create: grants },
        },
      }),
      prisma.auditLogEntry.create({ data: { ...auditEntry, before: toJsonInput(auditEntry.before) } }),
    ]);
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/moderators");
  return { status: "ok" };
}

export async function updateModeratorPrivileges(
  moderatorProfileId: string,
  formData: FormData
): Promise<AdminActionResult> {
  const access = await requireAdmin();
  if (access.status !== "ok") {
    return { status: "error", message: accessDeniedMessage(access) };
  }
  const actorId = access.profile.userId;
  if (!actorId) {
    return { status: "error", message: "Not authenticated." };
  }

  const role = parseRole(formData.get("role"));
  const desiredGrants = role === ModeratorRole.moderator ? parseGrantGrid(formData) : [];

  try {
    const target = await prisma.moderatorProfile.findUnique({
      where: { id: moderatorProfileId },
      include: { grants: true },
    });
    if (!target) {
      return { status: "error", message: "This moderator profile no longer exists." };
    }

    if (target.role === ModeratorRole.admin && target.isActive && role !== ModeratorRole.admin) {
      const otherActiveAdmins = await countOtherActiveAdmins(moderatorProfileId);
      if (otherActiveAdmins === 0) {
        return { status: "error", message: "Can't demote the last remaining active admin." };
      }
    }

    const diff =
      role === ModeratorRole.admin
        ? { toCreate: [], toUpdate: [], toDeleteIds: target.grants.map((g) => g.id) }
        : diffGrants(target.grants, desiredGrants);

    const finalGrants = role === ModeratorRole.admin ? [] : desiredGrants;
    const auditEntry = buildModeratorUpdateAuditEntry(
      moderatorProfileId,
      actorId,
      { role: target.role, grants: toGrantCells(target.grants) },
      { role, grants: finalGrants }
    );

    await prisma.$transaction([
      prisma.moderatorProfile.update({
        where: { id: moderatorProfileId },
        data: { role, lastEditedByUserId: actorId },
      }),
      ...(diff.toDeleteIds.length > 0
        ? [prisma.moderatorGrant.deleteMany({ where: { id: { in: diff.toDeleteIds } } })]
        : []),
      ...diff.toUpdate.map((g) =>
        prisma.moderatorGrant.update({ where: { id: g.id }, data: { canView: g.canView, canAct: g.canAct } })
      ),
      ...(diff.toCreate.length > 0
        ? [prisma.moderatorGrant.createMany({ data: diff.toCreate.map((g) => ({ ...g, moderatorProfileId })) })]
        : []),
      prisma.auditLogEntry.create({ data: auditEntry }),
    ]);
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/moderators");
  revalidatePath(`/admin/moderators/${moderatorProfileId}/edit`);
  return { status: "ok" };
}

export async function deactivateModerator(moderatorProfileId: string): Promise<AdminActionResult> {
  const access = await requireAdmin();
  if (access.status !== "ok") {
    return { status: "error", message: accessDeniedMessage(access) };
  }
  const actorId = access.profile.userId;
  if (!actorId) {
    return { status: "error", message: "Not authenticated." };
  }

  try {
    const target = await prisma.moderatorProfile.findUnique({ where: { id: moderatorProfileId } });
    if (!target) {
      return { status: "error", message: "This moderator profile no longer exists." };
    }
    if (!target.isActive) {
      return { status: "ok" };
    }

    if (target.role === ModeratorRole.admin) {
      const otherActiveAdmins = await countOtherActiveAdmins(moderatorProfileId);
      if (otherActiveAdmins === 0) {
        return { status: "error", message: "Can't remove the last remaining active admin." };
      }
    }

    const deactivatedAt = new Date();
    await prisma.$transaction([
      prisma.moderatorProfile.update({
        where: { id: moderatorProfileId },
        data: { isActive: false, deactivatedAt, lastEditedByUserId: actorId },
      }),
      prisma.auditLogEntry.create({
        data: buildModeratorDeactivateAuditEntry(moderatorProfileId, actorId, deactivatedAt),
      }),
    ]);
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/moderators");
  return { status: "ok" };
}

export async function reactivateModerator(moderatorProfileId: string): Promise<AdminActionResult> {
  const access = await requireAdmin();
  if (access.status !== "ok") {
    return { status: "error", message: accessDeniedMessage(access) };
  }
  const actorId = access.profile.userId;
  if (!actorId) {
    return { status: "error", message: "Not authenticated." };
  }

  try {
    const target = await prisma.moderatorProfile.findUnique({ where: { id: moderatorProfileId } });
    if (!target) {
      return { status: "error", message: "This moderator profile no longer exists." };
    }
    if (target.isActive) {
      return { status: "ok" };
    }

    await prisma.$transaction([
      prisma.moderatorProfile.update({
        where: { id: moderatorProfileId },
        data: { isActive: true, deactivatedAt: null, lastEditedByUserId: actorId },
      }),
      prisma.auditLogEntry.create({
        data: buildModeratorReactivateAuditEntry(moderatorProfileId, actorId, target.deactivatedAt),
      }),
    ]);
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/moderators");
  return { status: "ok" };
}
