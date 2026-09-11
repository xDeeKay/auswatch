"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ModeratorRole } from "@/generated/prisma/enums";
import { requireAdmin, normalizeModeratorEmail, accessDeniedMessage } from "@/lib/moderator-access";
import { parseGrantGrid, diffGrants } from "@/lib/moderator-grants";

export type AdminActionResult = { status: "ok" } | { status: "error"; message: string };

function parseRole(value: FormDataEntryValue | null): ModeratorRole {
  return value === ModeratorRole.admin ? ModeratorRole.admin : ModeratorRole.moderator;
}

async function countOtherActiveAdmins(excludeProfileId: string): Promise<number> {
  return prisma.moderatorProfile.count({
    where: { role: ModeratorRole.admin, isActive: true, id: { not: excludeProfileId } },
  });
}

export async function createModeratorProfile(formData: FormData): Promise<AdminActionResult> {
  const access = await requireAdmin();
  if (access.status !== "ok") {
    return { status: "error", message: accessDeniedMessage(access) };
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

    await prisma.moderatorProfile.create({
      data: {
        email,
        role,
        lastEditedByUserId: access.profile.userId,
        grants: { create: grants },
      },
    });
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

    await prisma.$transaction([
      prisma.moderatorProfile.update({
        where: { id: moderatorProfileId },
        data: { role, lastEditedByUserId: access.profile.userId },
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

    await prisma.moderatorProfile.update({
      where: { id: moderatorProfileId },
      data: { isActive: false, deactivatedAt: new Date(), lastEditedByUserId: access.profile.userId },
    });
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

  try {
    const target = await prisma.moderatorProfile.findUnique({ where: { id: moderatorProfileId } });
    if (!target) {
      return { status: "error", message: "This moderator profile no longer exists." };
    }

    await prisma.moderatorProfile.update({
      where: { id: moderatorProfileId },
      data: { isActive: true, deactivatedAt: null, lastEditedByUserId: access.profile.userId },
    });
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/moderators");
  return { status: "ok" };
}
