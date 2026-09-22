import type { Metadata } from "next";
import { ModeratorRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/moderator-access";
import { summarizeGrants } from "@/lib/moderator-grants";
import { reactivateModerator } from "@/lib/actions/admin-moderators";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AusWatch - Moderators",
};

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function AdminModeratorsPage() {
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  const moderators = await prisma.moderatorProfile.findMany({
    include: { user: true, grants: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader title="Moderators" actions={<Button href="/admin/moderators/new">Add moderator</Button>} />

      <div className="flex flex-col gap-4">
        {moderators.map((moderator) => (
          <div
            key={moderator.id}
            className={`rounded border p-5 ${
              moderator.isActive ? "border-parchment/20" : "border-parchment/10 opacity-60"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base text-parchment">
                    {moderator.user?.name ?? moderator.email}
                  </h2>
                  <Badge tone={moderator.role === ModeratorRole.admin ? "amber" : "neutral"}>
                    {moderator.role === ModeratorRole.admin ? "ADMIN" : "MODERATOR"}
                  </Badge>
                  <Badge tone={moderator.isActive ? "neutral" : "error"}>
                    {moderator.isActive ? "ACTIVE" : "DEACTIVATED"}
                  </Badge>
                </div>
                <p className="mt-1 font-label text-xs text-parchment/50">{moderator.email}</p>
                <p className="mt-2 text-sm text-parchment/85">
                  {moderator.role === ModeratorRole.admin
                    ? "Unrestricted access to every state and camera type."
                    : summarizeGrants(moderator.grants)}
                </p>
                <p className="mt-2 font-label text-xs text-parchment/50">
                  Added {dateFormatter.format(moderator.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button href={`/admin/moderators/${moderator.id}/edit`} size="sm">
                  Edit
                </Button>
                {moderator.isActive ? (
                  <Button href={`/admin/moderators/${moderator.id}/remove`} tone="destructive" size="sm">
                    Remove
                  </Button>
                ) : (
                  <form
                    action={async () => {
                      "use server";
                      await reactivateModerator(moderator.id);
                    }}
                  >
                    <Button type="submit" size="sm">
                      Reactivate
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}

        {moderators.length === 0 && <p className="text-sm text-parchment/50">No moderators yet.</p>}
      </div>
    </>
  );
}
