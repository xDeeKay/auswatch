import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AuditEntityType,
  CorrectionReportStatus,
  ModerationReasonCode,
  ModerationState,
  ModeratorRole,
  SensitiveSiteMatchSource,
} from "@/generated/prisma/enums";
import { TYPE_LABEL, CAPTURE_LABEL, STATUS_LABEL, HISTORY_EVENT_LABEL } from "@/lib/camera-labels";
import {
  REASON_CODE_LABEL,
  ACTION_TYPE_LABEL,
  MODERATION_STATE_LABEL,
  MATCH_SOURCE_LABEL,
  ZONE_CATEGORY_LABEL,
} from "@/lib/moderation-labels";
import { buildCorrectionDiffRows } from "@/lib/correction-diff";
import { verifyCamera, removeCamera } from "@/lib/actions/moderation";
import { approveCorrection, rejectCorrection } from "@/lib/actions/corrections";
import { addCameraNote } from "@/lib/actions/camera-notes";
import { overrideCameraState } from "@/lib/actions/camera-state";
import { revertAuditLogEntry } from "@/lib/actions/audit-log";
import { requireModerator, canView, canAct } from "@/lib/moderator-access";
import { AuState } from "@/generated/prisma/enums";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
import { formatAuditPayload } from "@/lib/audit-log-format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select, TextArea } from "@/components/ui/Field";
import { DiffTable } from "@/components/ui/DiffTable";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireModerator();
  if (access.status !== "ok") return null;
  const { profile } = access;

  const camera = await prisma.camera.findUnique({
    where: { id },
    include: {
      history: { orderBy: { date: "desc" } },
      moderationActions: { include: { actor: true, auditLogEntry: true }, orderBy: { createdAt: "desc" } },
      correctionReports: {
        where: { status: CorrectionReportStatus.pending },
        orderBy: { createdAt: "asc" },
      },
      internalNotes: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "desc" } },
      sensitiveSiteMatches: true,
    },
  });

  if (!camera || !canView(profile, { state: camera.state, type: camera.type })) {
    notFound();
  }

  const canActOnCamera = canAct(profile, { state: camera.state, type: camera.type });
  const isAdmin = profile.role === ModeratorRole.admin;
  const isPending = camera.moderationState === ModerationState.pending;

  const [allCorrectionIds, allNoteIds] = await Promise.all([
    prisma.correctionReport.findMany({ where: { cameraId: id }, select: { id: true } }),
    prisma.cameraNote.findMany({ where: { cameraId: id }, select: { id: true } }),
  ]);
  const auditLog = await prisma.auditLogEntry.findMany({
    where: {
      OR: [
        { entityType: AuditEntityType.camera, entityId: id },
        { entityType: AuditEntityType.correction_report, entityId: { in: allCorrectionIds.map((c) => c.id) } },
        { entityType: AuditEntityType.camera_note, entityId: { in: allNoteIds.map((n) => n.id) } },
      ],
    },
    include: { actor: true, revertedBy: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return (
    <>
      <PageHeader
        title={TYPE_LABEL[camera.type]}
        description={
          isPending ? <Badge tone="amber">NEW SUBMISSION</Badge> : <Badge tone="neutral">{MODERATION_STATE_LABEL[camera.moderationState]}</Badge>
        }
      />

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
          <dt className="font-mono text-xs tracking-[0.05em] text-amber">STATE</dt>
          <dd className="text-parchment/85">
            {camera.state ? STATE_LABEL[camera.state] : "Unresolved"}
            {camera.stateOverride && (
              <span className="ml-1 font-mono text-xs text-parchment/50">(manually set)</span>
            )}
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
        <div className="flex flex-col gap-2">
          {camera.sensitiveSiteMatches.map((match) =>
            match.source === SensitiveSiteMatchSource.check_error ? (
              <div key={match.id} className="rounded border border-error/50 bg-error/10 px-3 py-2 text-sm">
                <p className="font-mono text-xs tracking-[0.05em] text-error">AUTOMATED CHECK FAILED</p>
                <p className="mt-1 text-parchment/80">Manual review required. {match.detail}</p>
              </div>
            ) : (
              <div key={match.id} className="rounded border border-amber/40 bg-amber/5 px-3 py-2 text-sm">
                <p className="font-mono text-xs tracking-[0.05em] text-amber">
                  {MATCH_SOURCE_LABEL[match.source]}
                  {match.category ? ` - ${ZONE_CATEGORY_LABEL[match.category]}` : ""}
                </p>
                {match.distanceMeters !== null && (
                  <p className="mt-1 font-mono text-parchment/80">{Math.round(match.distanceMeters)}m away</p>
                )}
              </div>
            )
          )}
        </div>
      )}

      {isPending && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-base text-parchment">Decision</h2>
          {canActOnCamera ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await verifyCamera(camera.id, formData);
                }}
                className="flex flex-col gap-2"
              >
                <Select name="reasonCode" defaultValue="" required>
                  <option value="" disabled>
                    Reason for verifying
                  </option>
                  {Object.values(ModerationReasonCode).map((code) => (
                    <option key={code} value={code}>
                      {REASON_CODE_LABEL[code]}
                    </option>
                  ))}
                </Select>
                <TextArea name="note" placeholder="Optional note" rows={2} />
                <Button type="submit" tone="primary">
                  Verify
                </Button>
              </form>

              <form
                action={async (formData: FormData) => {
                  "use server";
                  await removeCamera(camera.id, formData);
                }}
                className="flex flex-col gap-2"
              >
                <Select name="reasonCode" defaultValue="" required>
                  <option value="" disabled>
                    Reason for removing
                  </option>
                  {Object.values(ModerationReasonCode).map((code) => (
                    <option key={code} value={code}>
                      {REASON_CODE_LABEL[code]}
                    </option>
                  ))}
                </Select>
                <TextArea name="note" placeholder="Optional note" rows={2} />
                <Button type="submit" tone="destructive">
                  Remove
                </Button>
              </form>
            </div>
          ) : (
            <p className="font-mono text-xs text-parchment/50">
              View only. You don&rsquo;t have permission to act on this ticket.
            </p>
          )}
        </section>
      )}

      {canActOnCamera && (
        <section className="flex flex-col gap-2 rounded border border-parchment/10 p-4">
          <h2 className="font-mono text-xs tracking-[0.05em] text-amber">CORRECT STATE</h2>
          <p className="text-xs text-parchment/50">
            Overrides the auto-derived state, for a border town or bad coordinates the
            automatic derivation got wrong.
          </p>
          <form
            action={async (formData: FormData) => {
              "use server";
              await overrideCameraState(camera.id, formData);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <Select name="state" defaultValue={camera.state ?? ""} className="w-auto">
              <option value="">Unresolved</option>
              {Object.values(AuState).map((state) => (
                <option key={state} value={state}>
                  {STATE_LABEL[state]}
                </option>
              ))}
            </Select>
            <Button type="submit">Set state</Button>
          </form>
        </section>
      )}

      {camera.correctionReports.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-base text-parchment">
            Pending corrections ({camera.correctionReports.length})
          </h2>
          {camera.correctionReports.map((correction) => {
            const diffRows = buildCorrectionDiffRows(camera, correction).map((row) => ({
              key: row.field,
              label: row.label,
              before: row.before,
              after: row.after,
            }));
            return (
              <Card key={correction.id}>
                <p className="font-mono text-xs text-parchment/50">
                  Submitted {dateFormatter.format(correction.createdAt)}
                </p>
                {correction.reporterNote && (
                  <p className="mt-2 text-sm text-parchment/85">&ldquo;{correction.reporterNote}&rdquo;</p>
                )}

                <DiffTable rows={diffRows} beforeLabel="CURRENT" afterLabel="PROPOSED" />

                {canActOnCamera ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await approveCorrection(correction.id, formData);
                      }}
                      className="flex flex-col gap-2"
                    >
                      <Select name="reasonCode" defaultValue="" required>
                        <option value="" disabled>
                          Reason for approving
                        </option>
                        {Object.values(ModerationReasonCode).map((code) => (
                          <option key={code} value={code}>
                            {REASON_CODE_LABEL[code]}
                          </option>
                        ))}
                      </Select>
                      <TextArea name="note" placeholder="Optional note" rows={2} />
                      <Button type="submit" tone="primary">
                        Approve
                      </Button>
                    </form>

                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await rejectCorrection(correction.id, formData);
                      }}
                      className="flex flex-col gap-2"
                    >
                      <Select name="reasonCode" defaultValue="" required>
                        <option value="" disabled>
                          Reason for rejecting
                        </option>
                        {Object.values(ModerationReasonCode).map((code) => (
                          <option key={code} value={code}>
                            {REASON_CODE_LABEL[code]}
                          </option>
                        ))}
                      </Select>
                      <TextArea name="note" placeholder="Optional note" rows={2} />
                      <Button type="submit" tone="destructive">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : (
                  <p className="mt-5 font-mono text-xs text-parchment/50">
                    View only. You don&rsquo;t have permission to act on this ticket.
                  </p>
                )}
              </Card>
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
                {action.auditLogEntry?.revertedAt && (
                  <Badge tone="error" className="ml-2">
                    REVERTED
                  </Badge>
                )}
              </p>
              {action.note && <p className="mt-1 text-parchment/85">{action.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-parchment">Audit log</h2>
        <p className="text-xs text-parchment/50">
          Every edit to this record, with before/after values.{" "}
          {isAdmin ? "Admins can revert any unreverted entry." : "Admins can revert entries here if needed."}
        </p>
        {auditLog.length === 0 && <p className="text-sm text-parchment/50">No audit entries yet.</p>}
        <ol className="flex flex-col gap-2">
          {auditLog.map((entry) => {
            const afterRows = formatAuditPayload(entry.after);
            return (
              <li key={entry.id} className="rounded border border-parchment/10 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-parchment/50">
                    {dateTimeFormatter.format(entry.createdAt)} - {AUDIT_ACTION_LABEL[entry.action]} by{" "}
                    {entry.actor.name ?? entry.actor.email ?? "Unknown"}
                    {entry.revertedAt && (
                      <Badge tone="error" className="ml-2">
                        REVERTED
                      </Badge>
                    )}
                  </p>
                  {isAdmin && entry.revertedAt === null && (
                    <form
                      action={async () => {
                        "use server";
                        await revertAuditLogEntry(entry.id);
                      }}
                    >
                      <Button type="submit" tone="destructive" size="xs">
                        Revert
                      </Button>
                    </form>
                  )}
                </div>
                {entry.summary && <p className="mt-1 text-parchment/85">{entry.summary}</p>}
                {afterRows.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-parchment/50">
                    {afterRows.map((row) => `${row.label}: ${row.text}`).join(" - ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-parchment">Moderator notes</h2>
        <p className="text-xs text-parchment/50">
          Internal only. Never shown on the public map or API.
        </p>
        {camera.internalNotes.length === 0 && (
          <p className="text-sm text-parchment/50">No notes yet.</p>
        )}
        <ol className="flex flex-col gap-2">
          {camera.internalNotes.map((note) => (
            <li key={note.id} className="rounded border border-parchment/10 px-3 py-2 text-sm">
              <p className="font-mono text-xs text-parchment/50">
                {dateFormatter.format(note.createdAt)} - {note.author.name ?? note.author.email ?? "Unknown moderator"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-parchment/85">{note.body}</p>
            </li>
          ))}
        </ol>

        <form
          action={async (formData: FormData) => {
            "use server";
            await addCameraNote(camera.id, formData);
          }}
          className="flex flex-col gap-2"
        >
          <TextArea
            name="body"
            placeholder="Add an internal note (visible to moderators only)"
            rows={3}
            maxLength={4000}
            required
          />
          <Button type="submit" className="self-start">
            Add note
          </Button>
        </form>
      </section>
    </>
  );
}
