import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { ModeratorProfileModel, ModeratorGrantModel } from "@/generated/prisma/models";
import { AuState, CameraType, ModeratorRole } from "@/generated/prisma/enums";

export type ModeratorProfileWithGrants = ModeratorProfileModel & { grants: ModeratorGrantModel[] };

export type ScopedTicket = { state: AuState | null; type: CameraType };

export type ModeratorAccessResult =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "ok"; profile: ModeratorProfileWithGrants };

export function normalizeModeratorEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Always re-reads the profile from the database rather than trusting anything
 * cached on the session, so a deactivation or grant edit takes effect on the
 * caller's very next request rather than after they sign out.
 */
export async function requireModerator(): Promise<ModeratorAccessResult> {
  const userId = await getSessionUserId();
  if (!userId) return { status: "unauthenticated" };

  const profile = await prisma.moderatorProfile.findUnique({
    where: { userId },
    include: { grants: true },
  });

  if (!profile || !profile.isActive) return { status: "forbidden" };
  return { status: "ok", profile };
}

export async function requireAdmin(): Promise<ModeratorAccessResult> {
  const result = await requireModerator();
  if (result.status !== "ok") return result;
  if (result.profile.role !== ModeratorRole.admin) return { status: "forbidden" };
  return result;
}

export async function getModeratorProfile(): Promise<ModeratorProfileWithGrants | null> {
  const result = await requireModerator();
  return result.status === "ok" ? result.profile : null;
}

export function accessDeniedMessage(access: { status: "unauthenticated" | "forbidden" }): string {
  return access.status === "unauthenticated"
    ? "Not authenticated."
    : "Your moderator access has been revoked or is no longer active.";
}

export function findGrant(
  profile: ModeratorProfileWithGrants,
  ticket: ScopedTicket
): ModeratorGrantModel | undefined {
  if (ticket.state === null) return undefined;
  return profile.grants.find((g) => g.state === ticket.state && g.cameraType === ticket.type);
}

/** A grant with canAct also implies canView, even if canView were somehow false on the row. */
export function canView(profile: ModeratorProfileWithGrants, ticket: ScopedTicket): boolean {
  if (profile.role === ModeratorRole.admin) return true;
  const grant = findGrant(profile, ticket);
  if (!grant) return false;
  return grant.canView || grant.canAct;
}

export function canAct(profile: ModeratorProfileWithGrants, ticket: ScopedTicket): boolean {
  if (profile.role === ModeratorRole.admin) return true;
  return findGrant(profile, ticket)?.canAct === true;
}

export type ActPermissionCheck = { ok: true } | { ok: false; message: string };

export function assertCanAct(profile: ModeratorProfileWithGrants, ticket: ScopedTicket): ActPermissionCheck {
  if (!canAct(profile, ticket)) {
    return { ok: false, message: "You do not have permission to act on this ticket." };
  }
  return { ok: true };
}

function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map(normalizeModeratorEmail)
    .filter(Boolean);
}

/**
 * Decides whether a sign-in should be allowed for this email, provisioning or
 * linking the ModeratorProfile as a side effect so an admin can grant access
 * to someone before their first sign-in.
 */
export async function resolveModeratorSignIn(
  email: string | null | undefined,
  userId: string
): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = normalizeModeratorEmail(email);

  const existing = await prisma.moderatorProfile.findUnique({ where: { email: normalizedEmail } });

  if (!existing) {
    const bootstrapEmails = parseEmailList(process.env.BOOTSTRAP_ADMIN_EMAILS);
    if (!bootstrapEmails.includes(normalizedEmail)) return false;

    await prisma.moderatorProfile.create({
      data: {
        email: normalizedEmail,
        userId,
        role: ModeratorRole.admin,
        isActive: true,
      },
    });
    return true;
  }

  if (!existing.isActive) return false;

  if (existing.userId === null) {
    await prisma.moderatorProfile.update({
      where: { id: existing.id },
      data: { userId },
    });
    return true;
  }

  if (existing.userId === userId) return true;

  console.warn(
    `ModeratorProfile for ${normalizedEmail} is linked to a different userId than the one signing in; denying sign-in.`
  );
  return false;
}
