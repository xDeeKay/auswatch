import Link from "next/link";
import { prisma } from "@/lib/db";
import { ModerationState, ModerationReasonCode, SensitiveSiteMatchSource, CorrectionReportStatus } from "@/generated/prisma/enums";
import { TYPE_LABEL, CAPTURE_LABEL } from "@/lib/camera-labels";
import { REASON_CODE_LABEL, MATCH_SOURCE_LABEL, ZONE_CATEGORY_LABEL } from "@/lib/moderation-labels";
import { verifyCamera, removeCamera } from "@/lib/actions/moderation";
import { requireModerator, canView, canAct } from "@/lib/moderator-access";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const selectClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";
const noteClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment placeholder:text-parchment/30 focus:border-amber focus:outline-none";

export default async function ModeratePage() {
  const access = await requireModerator();

  if (access.status !== "ok") {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">
          {access.status === "unauthenticated" ? "Moderator sign in required" : "Access revoked"}
        </h1>
        {access.status === "forbidden" && (
          <p className="text-sm text-parchment/70">
            Your moderator access has been revoked or is no longer active.
          </p>
        )}
        <a
          href="/moderate/sign-in"
          className="rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Go to sign in
        </a>
      </main>
    );
  }

  const { profile } = access;

  const [allPendingCameras, allPendingCorrectionCameras] = await Promise.all([
    prisma.camera.findMany({
      where: { moderationState: ModerationState.pending },
      orderBy: { createdAt: "asc" },
      include: { sensitiveSiteMatches: true },
    }),
    prisma.camera.findMany({
      where: { correctionReports: { some: { status: CorrectionReportStatus.pending } } },
      select: { state: true, type: true },
    }),
  ]);

  const cameras = allPendingCameras.filter((camera) =>
    canView(profile, { state: camera.state, type: camera.type })
  );
  const pendingCorrectionCameraCount = allPendingCorrectionCameras.filter((camera) =>
    canView(profile, { state: camera.state, type: camera.type })
  ).length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Review queue</h1>
        <p className="mt-2 text-sm text-parchment/70">
          {cameras.length} pending submission{cameras.length === 1 ? "" : "s"}
        </p>
        <Link
          href="/moderate/corrections"
          className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          {pendingCorrectionCameraCount} pending correction{pendingCorrectionCameraCount === 1 ? "" : "s"} &rarr;
        </Link>
        <Link
          href="/moderate/cameras"
          className="mt-1 block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Browse cameras &rarr;
        </Link>
      </header>

      <div className="flex flex-col gap-6">
        {cameras.map((camera) => (
          <div key={camera.id} className="rounded border border-parchment/20 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-heading text-base text-parchment">{TYPE_LABEL[camera.type]}</h2>
              <p className="font-mono text-xs text-parchment/50">
                {dateFormatter.format(camera.createdAt)}
              </p>
            </div>

            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-mono text-xs tracking-[0.05em] text-amber">OPERATOR</dt>
                <dd className="text-parchment/85">{camera.operator || "Unknown"}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.05em] text-amber">APPEARS TO CAPTURE</dt>
                <dd className="text-parchment/85">{CAPTURE_LABEL[camera.captures]}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.05em] text-amber">LOCATION</dt>
                <dd className="font-mono text-parchment/85">
                  {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-[0.05em] text-amber">ID</dt>
                <dd className="font-mono text-parchment/85">{camera.id}</dd>
              </div>
              {camera.notes && (
                <div className="sm:col-span-2">
                  <dt className="font-mono text-xs tracking-[0.05em] text-amber">NOTES</dt>
                  <dd className="text-parchment/85">{camera.notes}</dd>
                </div>
              )}
            </dl>

            {camera.sensitiveSiteMatches.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {camera.sensitiveSiteMatches.map((match) =>
                  match.source === SensitiveSiteMatchSource.check_error ? (
                    <div key={match.id} className="rounded border border-error/50 bg-error/10 px-3 py-2 text-sm">
                      <p className="font-mono text-xs tracking-[0.05em] text-error">
                        AUTOMATED CHECK FAILED
                      </p>
                      <p className="mt-1 text-parchment/80">
                        Manual review required. {match.detail}
                      </p>
                    </div>
                  ) : (
                    <div key={match.id} className="rounded border border-amber/40 bg-amber/5 px-3 py-2 text-sm">
                      <p className="font-mono text-xs tracking-[0.05em] text-amber">
                        {MATCH_SOURCE_LABEL[match.source]}
                        {match.category ? ` - ${ZONE_CATEGORY_LABEL[match.category]}` : ""}
                      </p>
                      {match.distanceMeters !== null && (
                        <p className="mt-1 font-mono text-parchment/80">
                          {Math.round(match.distanceMeters)}m away
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {canAct(profile, { state: camera.state, type: camera.type }) ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await verifyCamera(camera.id, formData);
                  }}
                  className="flex flex-col gap-2"
                >
                  <select name="reasonCode" className={selectClass} defaultValue="" required>
                    <option value="" disabled>
                      Reason for verifying
                    </option>
                    {Object.values(ModerationReasonCode).map((code) => (
                      <option key={code} value={code}>
                        {REASON_CODE_LABEL[code]}
                      </option>
                    ))}
                  </select>
                  <textarea name="note" className={noteClass} placeholder="Optional note" rows={2} />
                  <button
                    type="submit"
                    className="rounded border border-amber bg-amber/10 px-3 py-1.5 font-mono text-sm text-amber transition hover:bg-amber/20"
                  >
                    Verify
                  </button>
                </form>

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await removeCamera(camera.id, formData);
                  }}
                  className="flex flex-col gap-2"
                >
                  <select name="reasonCode" className={selectClass} defaultValue="" required>
                    <option value="" disabled>
                      Reason for removing
                    </option>
                    {Object.values(ModerationReasonCode).map((code) => (
                      <option key={code} value={code}>
                        {REASON_CODE_LABEL[code]}
                      </option>
                    ))}
                  </select>
                  <textarea name="note" className={noteClass} placeholder="Optional note" rows={2} />
                  <button
                    type="submit"
                    className="rounded border border-error bg-error/10 px-3 py-1.5 font-mono text-sm text-error transition hover:bg-error/20"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ) : (
              <p className="mt-5 font-mono text-xs text-parchment/50">
                View only. You don&rsquo;t have permission to act on this ticket.
              </p>
            )}
          </div>
        ))}

        {cameras.length === 0 && (
          <p className="text-sm text-parchment/50">Nothing pending review right now.</p>
        )}
      </div>
    </main>
  );
}
