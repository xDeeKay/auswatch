import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ModerationState } from "@/generated/prisma/enums";
import { TYPE_LABEL } from "@/lib/camera-labels";
import { MODERATION_STATE_LABEL } from "@/lib/moderation-labels";

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
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Moderator sign in required</h1>
        <a
          href="/moderate/sign-in"
          className="rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Go to sign in
        </a>
      </main>
    );
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const cameras = await prisma.camera.findMany({
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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Cameras</h1>
        <p className="mt-2 text-sm text-parchment/70">
          Browse live cameras to leave a moderator note or review their record.
        </p>
        <Link
          href="/moderate"
          className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Back to review queue
        </Link>
      </header>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by operator or notes"
          className="w-full rounded border border-parchment/20 bg-transparent px-3 py-2 text-sm text-parchment placeholder:text-parchment/30 focus:border-amber focus:outline-none"
        />
        <button
          type="submit"
          className="rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Search
        </button>
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
    </main>
  );
}
