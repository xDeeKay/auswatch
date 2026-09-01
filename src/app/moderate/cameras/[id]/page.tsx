import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CorrectionReportStatus, ModerationReasonCode } from "@/generated/prisma/enums";
import { TYPE_LABEL, CAPTURE_LABEL, STATUS_LABEL, HISTORY_EVENT_LABEL } from "@/lib/camera-labels";
import { REASON_CODE_LABEL, ACTION_TYPE_LABEL, MODERATION_STATE_LABEL } from "@/lib/moderation-labels";
import { buildCorrectionDiffRows } from "@/lib/correction-diff";
import { approveCorrection, rejectCorrection } from "@/lib/actions/corrections";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const selectClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";
const noteClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment placeholder:text-parchment/30 focus:border-amber focus:outline-none";

export default async function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const camera = await prisma.camera.findUnique({
    where: { id },
    include: {
      history: { orderBy: { date: "desc" } },
      moderationActions: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      correctionReports: {
        where: { status: CorrectionReportStatus.pending },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!camera) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">{TYPE_LABEL[camera.type]}</h1>
        <Link
          href="/moderate/corrections"
          className="mt-1 inline-block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Back to pending corrections
        </Link>
      </header>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-mono text-xs tracking-[0.05em] text-amber">OPERATOR</dt>
          <dd className="text-parchment/85">{camera.operator || "Unknown"}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs tracking-[0.05em] text-amber">APPEARS TO CAPTURE</dt>
          <dd className="text-parchment/85">{CAPTURE_LABEL[camera.captures]}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs tracking-[0.05em] text-amber">STATUS</dt>
          <dd className="text-parchment/85">{STATUS_LABEL[camera.status]}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs tracking-[0.05em] text-amber">MODERATION STATE</dt>
          <dd className="text-parchment/85">{MODERATION_STATE_LABEL[camera.moderationState]}</dd>
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

      {camera.correctionReports.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-base text-parchment">
            Pending corrections ({camera.correctionReports.length})
          </h2>
          {camera.correctionReports.map((correction) => {
            const diffRows = buildCorrectionDiffRows(camera, correction);
            return (
              <div key={correction.id} className="rounded border border-parchment/20 p-5">
                <p className="font-mono text-xs text-parchment/50">
                  Submitted {dateFormatter.format(correction.createdAt)}
                </p>
                {correction.reporterNote && (
                  <p className="mt-2 text-sm text-parchment/85">&ldquo;{correction.reporterNote}&rdquo;</p>
                )}

                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-xs tracking-[0.05em] text-amber">
                      <th className="pb-1 pr-4">FIELD</th>
                      <th className="pb-1 pr-4">CURRENT</th>
                      <th className="pb-1">PROPOSED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map((row) => (
                      <tr key={row.field} className="border-t border-parchment/10">
                        <td className="py-1.5 pr-4 text-parchment/70">{row.label}</td>
                        <td className="py-1.5 pr-4 text-parchment/85">{row.before}</td>
                        <td className="py-1.5 text-amber">{row.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await approveCorrection(correction.id, formData);
                    }}
                    className="flex flex-col gap-2"
                  >
                    <select name="reasonCode" className={selectClass} defaultValue="" required>
                      <option value="" disabled>
                        Reason for approving
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
                      Approve
                    </button>
                  </form>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await rejectCorrection(correction.id, formData);
                    }}
                    className="flex flex-col gap-2"
                  >
                    <select name="reasonCode" className={selectClass} defaultValue="" required>
                      <option value="" disabled>
                        Reason for rejecting
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
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-parchment">History</h2>
        {camera.history.length === 0 && (
          <p className="text-sm text-parchment/50">No history events yet.</p>
        )}
        <ol className="flex flex-col gap-2">
          {camera.history.map((event) => (
            <li key={event.id} className="rounded border border-parchment/10 px-3 py-2 text-sm">
              <p className="font-mono text-xs text-parchment/50">
                {dateFormatter.format(event.date)} - {HISTORY_EVENT_LABEL[event.eventType]}
              </p>
              {event.note && <p className="mt-1 text-parchment/85">{event.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-parchment">Moderation actions</h2>
        {camera.moderationActions.length === 0 && (
          <p className="text-sm text-parchment/50">No moderator decisions yet.</p>
        )}
        <ol className="flex flex-col gap-2">
          {camera.moderationActions.map((action) => (
            <li key={action.id} className="rounded border border-parchment/10 px-3 py-2 text-sm">
              <p className="font-mono text-xs text-parchment/50">
                {dateFormatter.format(action.createdAt)} - {ACTION_TYPE_LABEL[action.action]} by{" "}
                {action.actor.name ?? action.actor.email ?? "Unknown moderator"} ({REASON_CODE_LABEL[action.reasonCode]})
              </p>
              {action.note && <p className="mt-1 text-parchment/85">{action.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
