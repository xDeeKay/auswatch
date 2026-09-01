import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CorrectionReportStatus } from "@/generated/prisma/enums";
import { TYPE_LABEL } from "@/lib/camera-labels";

export default async function ModerateCorrectionsPage() {
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

  const cameras = await prisma.camera.findMany({
    where: { correctionReports: { some: { status: CorrectionReportStatus.pending } } },
    include: {
      _count: { select: { correctionReports: { where: { status: CorrectionReportStatus.pending } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Pending corrections</h1>
        <p className="mt-2 text-sm text-parchment/70">
          {cameras.length} camera{cameras.length === 1 ? "" : "s"} with open correction reports
        </p>
        <Link
          href="/moderate"
          className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Back to review queue
        </Link>
      </header>

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
            <p className="font-mono text-xs text-amber">
              {camera._count.correctionReports} pending
            </p>
          </Link>
        ))}

        {cameras.length === 0 && (
          <p className="text-sm text-parchment/50">No cameras have open correction reports right now.</p>
        )}
      </div>
    </main>
  );
}
