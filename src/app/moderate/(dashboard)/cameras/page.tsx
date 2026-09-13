import Link from "next/link";
import { prisma } from "@/lib/db";
import { ModerationState } from "@/generated/prisma/enums";
import { TYPE_LABEL } from "@/lib/camera-labels";
import { MODERATION_STATE_LABEL } from "@/lib/moderation-labels";
import { requireModerator, canView } from "@/lib/moderator-access";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const CAMERA_LIST_LIMIT = 100;

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function ModerateCamerasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const access = await requireModerator();
  if (access.status !== "ok") return null;
  const { profile } = access;

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const matchingCameras = await prisma.camera.findMany({
    where: {
      moderationState: { in: [ModerationState.verified, ModerationState.disputed] },
      ...(query
        ? {
            OR: [
              { operator: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: CAMERA_LIST_LIMIT,
  });

  const cameras = matchingCameras.filter((camera) =>
    canView(profile, { state: camera.state, type: camera.type })
  );

  return (
    <>
      <PageHeader title="Cameras" description="Browse live cameras to leave a moderator note or review their record." />

      <form method="get" className="flex gap-2">
        <TextInput type="text" name="q" defaultValue={query} placeholder="Search by operator or notes" />
        <Button type="submit">Search</Button>
      </form>

      <div className="flex flex-col gap-3">
        {cameras.map((camera) => (
          <Link
            key={camera.id}
            href={`/moderate/cameras/${camera.id}`}
            className="flex items-center justify-between rounded border border-parchment/20 p-4 transition hover:border-amber/40"
          >
            <div>
              <p className="font-heading text-sm text-parchment">{TYPE_LABEL[camera.type]}</p>
              <p className="font-mono text-xs text-parchment/50">{camera.operator || "Unknown"}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-amber">{MODERATION_STATE_LABEL[camera.moderationState]}</p>
              <p className="font-mono text-xs text-parchment/50">{dateFormatter.format(camera.createdAt)}</p>
            </div>
          </Link>
        ))}

        {cameras.length === 0 && (
          <p className="text-sm text-parchment/50">
            {query ? "No cameras match that search." : "No live cameras yet."}
          </p>
        )}
      </div>
    </>
  );
}
