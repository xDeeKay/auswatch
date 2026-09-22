import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { deactivateModerator } from "@/lib/actions/admin-moderators";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AusWatch - Remove moderator",
};

export default async function RemoveModeratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  const moderator = await prisma.moderatorProfile.findUnique({ where: { id }, include: { user: true } });
  if (!moderator) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10 text-center">
      <h1 className="font-heading text-lg text-parchment">Remove {moderator.user?.name ?? moderator.email}?</h1>
      <p className="text-sm text-parchment/70">
        This revokes their sign-in and every privilege, but keeps their moderation history intact. It can be
        undone later from the moderators list.
      </p>
      <div className="flex justify-center gap-3">
        <Button href="/admin/moderators" tone="secondary">
          Cancel
        </Button>
        <form
          action={async () => {
            "use server";
            const result = await deactivateModerator(id);
            if (result.status === "ok") {
              redirect("/admin/moderators");
            }
          }}
        >
          <Button type="submit" tone="destructive">
            Remove access
          </Button>
        </form>
      </div>
    </div>
  );
}
