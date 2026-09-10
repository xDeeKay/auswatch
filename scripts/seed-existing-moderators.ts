import "dotenv/config";
import { prisma } from "@/lib/db";
import { ModeratorRole } from "@/generated/prisma/enums";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  const raw = process.env.MODERATOR_EMAILS ?? "";
  const emails = Array.from(
    new Set(
      raw
        .split(",")
        .map(normalizeEmail)
        .filter(Boolean)
    )
  );

  if (emails.length === 0) {
    console.log("MODERATOR_EMAILS is empty, nothing to seed.");
    process.exit(0);
  }

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });

    const profile = await prisma.moderatorProfile.upsert({
      where: { email },
      create: {
        email,
        userId: user?.id ?? null,
        role: ModeratorRole.admin,
        isActive: true,
      },
      update: {
        userId: user?.id ?? undefined,
      },
    });

    console.log(
      `${email}: ${profile.role} profile ${profile.userId ? "linked to an existing user" : "provisioned, will link on first sign-in"}`
    );
  }

  console.log(`\nSeeded ${emails.length} existing moderator(s) as unrestricted admins.`);
  console.log("This preserves today's behavior; use /admin/moderators to re-scope anyone down to a moderator role afterward.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
