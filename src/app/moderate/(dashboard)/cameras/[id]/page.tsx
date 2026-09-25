import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AuditEntityType,
  CorrectionReportStatus,
  ModerationState,
  ModeratorRole,
  PhotoModerationStatus,
  SensitiveSiteMatchSource,
} from "@/generated/prisma/enums";
import { TYPE_LABEL, CAPTURE_LABEL, STATUS_LABEL, HISTORY_EVENT_LABEL, OPERATOR_CATEGORY_LABEL } from "@/lib/camera-labels";
import {
  REASON_CODE_LABEL,
  VERIFY_REASON_CODES,
  REMOVE_REASON_CODES,
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
import { Button } from "@/components/ui/Button";
import { Label, Select, TextArea } from "@/components/ui/Field";
import TicketLocationMap from "@/components/TicketLocationMap";

export const metadata: Metadata = {
  title: "AusWatch - Camera review",
};

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatGpsSignal(gpsDistanceMeters: number | null): string {
  if (gpsDistanceMeters === null) return "GPS: no location data in photo";
  return `GPS: ${Math.round(gpsDistanceMeters).toLocaleString("en-AU")}m from submitted pin`;
}

function formatCapturedAgeSignal(capturedAgeHours: number | null): string {
  if (capturedAgeHours === null) return "Taken: no capture date in photo";
  if (capturedAgeHours < 0) return "Taken: after the submission was sent (check this)";
  if (capturedAgeHours < 48) return `Taken: ${Math.round(capturedAgeHours)}h before submission`;
  return `Taken: ${Math.round(capturedAgeHours / 24)}d before submission`;
}

const PHOTO_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting decision",
  approved: "Approved for public display",
  rejected: "Not shown publicly",
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded border border-foreground/10">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-heading text-base text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-foreground/40 transition group-open:rotate-180">&#9662;</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>
    </details>
  );
}

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
        include: { photos: true },
      },
      internalNotes: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "desc" } },
      sensitiveSiteMatches: true,
      photos: { orderBy: { createdAt: "asc" } },
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

  // Revert eligibility is per-entity, not per-row: this page mixes entries
  // for the camera itself, each of its correction reports, and each of its
  // notes, and revertAuditLogEntry only allows reverting the single most
  // recent (unreverted) entry within one entity's own timeline (see
  // assertRevertable in audit-log-revert.ts) - reverting out of order would
  // leave that entity in an undefined intermediate state. auditLog is
  // already ordered newest-first, matching the query revertAuditLogEntry
  // itself uses to find the head, so the first entry seen per entity here is
  // exactly that entity's current head.
  const headEntryIdByEntity = new Map<string, string>();
  for (const entry of auditLog) {
    const key = `${entry.entityType}:${entry.entityId}`;
    if (!headEntryIdByEntity.has(key)) headEntryIdByEntity.set(key, entry.id);
  }

  const sensitiveSiteMarkers = camera.sensitiveSiteMatches
    .filter((m): m is typeof m & { lat: number; lng: number } => m.lat !== null && m.lng !== null)
    .map((m) => ({ lat: m.lat, lng: m.lng }));

  const proposedByField = new Map(
    camera.correctionReports.flatMap((correction) =>
      buildCorrectionDiffRows(camera, correction).map((row) => [row.field, row.after] as const)
    )
  );

  function proposedSuffix(field: string) {
    const after = proposedByField.get(field);
    return after ? <span className="ml-1 text-amber">&rarr; {after}</span> : null;
  }

  return (
    <>
      <PageHeader
        title={TYPE_LABEL[camera.type]}
        description={
          isPending ? (
            <Badge tone="amber">NEW SUBMISSION</Badge>
          ) : camera.correctionReports.length > 0 ? (
            <Badge tone="neutral">CORRECTION</Badge>
          ) : (
            <Badge tone="neutral">{MODERATION_STATE_LABEL[camera.moderationState]}</Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <table className="w-full table-fixed text-sm">
            <tbody>
              {isPending && (
                <tr className="border-t border-foreground/10 first:border-t-0">
                  <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                    SUBMITTED
                  </th>
                  <td className="py-1.5 text-foreground/85">{dateTimeFormatter.format(camera.createdAt)}</td>
                </tr>
              )}
              {camera.correctionReports.length > 0 && (
                <tr className="border-t border-foreground/10 first:border-t-0">
                  <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                    SUBMITTED
                  </th>
                  <td className="py-1.5 text-foreground/85">
                    {camera.correctionReports.map((c) => dateTimeFormatter.format(c.createdAt)).join(", ")}
                  </td>
                </tr>
              )}
              <tr className="border-t border-foreground/10 first:border-t-0">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  ID
                </th>
                <td className="break-words py-1.5 font-label text-foreground/85">{camera.id}</td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  STATUS
                </th>
                <td className="py-1.5 text-foreground/85">
                  {STATUS_LABEL[camera.status]}
                  {proposedSuffix("status")}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  MODERATION STATE
                </th>
                <td className="py-1.5 text-foreground/85">{MODERATION_STATE_LABEL[camera.moderationState]}</td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  CAMERA TYPE
                </th>
                <td className="py-1.5 text-foreground/85">
                  {TYPE_LABEL[camera.type]}
                  {proposedSuffix("type")}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  APPEARS TO CAPTURE
                </th>
                <td className="py-1.5 text-foreground/85">
                  {CAPTURE_LABEL[camera.captures]}
                  {proposedSuffix("captures")}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  OPERATOR CATEGORY
                </th>
                <td className="py-1.5 text-foreground/85">
                  {OPERATOR_CATEGORY_LABEL[camera.operatorCategory]}
                  {proposedSuffix("operatorCategory")}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  OPERATOR
                </th>
                <td className="py-1.5 text-foreground/85">
                  {camera.operator || "Unknown"}
                  {proposedSuffix("operator")}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left align-top font-label text-xs font-normal text-foreground/50">
                  NOTES
                </th>
                <td className="break-words py-1.5 text-foreground/85">
                  {camera.notes || "(none)"}
                  {proposedSuffix("notes")}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  STATE/TERRITORY
                </th>
                <td className="py-1.5 text-foreground/85">
                  {camera.state ? STATE_LABEL[camera.state] : "Unresolved"}
                  {camera.stateOverride && (
                    <span className="ml-1 font-label text-xs text-foreground/50">(manually set)</span>
                  )}
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <th scope="row" className="w-44 py-1.5 pr-4 text-left font-label text-xs font-normal text-foreground/50">
                  LOCATION
                </th>
                <td className="py-1.5 font-label text-foreground/85">
                  {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
                  {proposedSuffix("location")}
                </td>
              </tr>
              {camera.correctionReports.some((c) => c.reporterNote) && (
                <tr className="border-t border-foreground/10">
                  <th scope="row" className="w-44 py-1.5 pr-4 text-left align-top font-label text-xs font-normal text-foreground/50">
                    CORRECTION NOTE
                  </th>
                  <td className="break-words py-1.5 text-foreground/85">
                    {camera.correctionReports
                      .filter((c) => c.reporterNote)
                      .map((c, i) => (
                        <p key={c.id} className={i > 0 ? "mt-1" : undefined}>
                          &ldquo;{c.reporterNote}&rdquo;
                        </p>
                      ))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="h-60 overflow-hidden rounded border border-foreground/20">
            <TicketLocationMap lat={camera.lat} lng={camera.lng} sensitiveSites={sensitiveSiteMarkers} />
          </div>

          {camera.sensitiveSiteMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              {camera.sensitiveSiteMatches.map((match) =>
                match.source === SensitiveSiteMatchSource.check_error ? (
                  <div key={match.id} className="rounded border border-error/50 bg-error/10 px-3 py-2 text-sm">
                    <p className="font-label text-xs text-error">AUTOMATED CHECK FAILED</p>
                    <p className="mt-1 text-foreground/80">Manual review required. {match.detail}</p>
                  </div>
                ) : (
                  <div key={match.id} className="rounded border border-amber/40 bg-amber/5 px-3 py-2 text-sm">
                    <p className="font-label text-xs text-amber">
                      {MATCH_SOURCE_LABEL[match.source]}
                      {match.category ? ` - ${ZONE_CATEGORY_LABEL[match.category]}` : ""}
                    </p>
                    {match.distanceMeters !== null && (
                      <p className="mt-1 font-label text-foreground/80">{Math.round(match.distanceMeters)}m away</p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {(isPending || canActOnCamera || camera.correctionReports.length > 0) && (
          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            {isPending && (
              <section className="flex flex-col gap-3">
                {canActOnCamera ? (
                  <div className="flex flex-col gap-6">
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await verifyCamera(camera.id, formData);
                      }}
                      className="flex flex-col gap-2"
                    >
                      {camera.photos.filter((p) => p.moderationStatus === PhotoModerationStatus.pending).length > 0 && (
                        <div className="flex flex-col gap-1.5 rounded border border-foreground/20 p-2.5">
                          <p className="font-label text-xs text-amber">APPROVE FOR PUBLIC DISPLAY</p>
                          {camera.photos
                            .filter((p) => p.moderationStatus === PhotoModerationStatus.pending)
                            .map((photo, i) => (
                              <label key={photo.id} className="flex items-center gap-2 text-sm text-foreground/85">
                                <input type="checkbox" name="approvedPhotoIds" value={photo.id} className="accent-amber" />
                                Photo {i + 1}
                              </label>
                            ))}
                          <p className="text-xs text-foreground/50">Unchecked photos stay moderator-only.</p>
                        </div>
                      )}
                      <Select name="reasonCode" defaultValue="" required>
                        <option value="" disabled>
                          Reason for verifying
                        </option>
                        {VERIFY_REASON_CODES.map((code) => (
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
                        {REMOVE_REASON_CODES.map((code) => (
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
                  <p className="font-label text-xs text-foreground/50">
                    View only. You don&rsquo;t have permission to act on this ticket.
                  </p>
                )}
              </section>
            )}

            {camera.correctionReports.length > 0 && (
              <section className="flex flex-col gap-4">
                {canActOnCamera ? (
                  camera.correctionReports.map((correction) => (
                    <div key={correction.id} className="flex flex-col gap-2">
                      {camera.correctionReports.length > 1 && (
                        <p className="font-label text-xs text-foreground/50">
                          Submitted {dateFormatter.format(correction.createdAt)}
                        </p>
                      )}
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
                          {VERIFY_REASON_CODES.map((code) => (
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
                          {REMOVE_REASON_CODES.map((code) => (
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
                  ))
                ) : (
                  <p className="font-label text-xs text-foreground/50">
                    View only. You don&rsquo;t have permission to act on this ticket.
                  </p>
                )}
              </section>
            )}

            {canActOnCamera && (
              <section className="flex flex-col gap-2 rounded border border-foreground/10 p-4">
                <h2 className="font-label text-xs text-amber">CORRECT STATE</h2>
                <p className="text-xs text-foreground/50">
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
                    {Object.values(AuState)
                      .sort((a, b) => STATE_LABEL[a].localeCompare(STATE_LABEL[b]))
                      .map((state) => (
                        <option key={state} value={state}>
                          {STATE_LABEL[state]}
                        </option>
                      ))}
                  </Select>
                  <Button type="submit">Set state</Button>
                </form>
              </section>
            )}
          </div>
        )}

        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
          {(camera.photos.length > 0 || camera.correctionReports.some((c) => c.photos.length > 0)) && (
            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-base text-foreground">Photo evidence</h2>
              <div className="flex flex-wrap gap-3">
                {camera.photos.map((photo, i) => (
                  <div key={photo.id} className="w-40 rounded border border-foreground/20 p-2">
                    <a href={`/api/photos/${photo.id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- moderator-only/gated image served from an authenticated route, not a next/image candidate */}
                      <img
                        src={`/api/photos/${photo.id}`}
                        alt={`Submitted photo ${i + 1}`}
                        className="h-28 w-full rounded object-cover"
                      />
                    </a>
                    <p className="mt-1.5 font-label text-xs text-foreground/70">{formatGpsSignal(photo.gpsDistanceMeters)}</p>
                    <p className="font-label text-xs text-foreground/70">{formatCapturedAgeSignal(photo.capturedAgeHours)}</p>
                    <p className="mt-1 font-label text-xs text-amber">{PHOTO_STATUS_LABEL[photo.moderationStatus]}</p>
                  </div>
                ))}
                {camera.correctionReports.flatMap((correction) => correction.photos).map((photo, i) => (
                  <div key={photo.id} className="w-40 rounded border border-foreground/20 p-2">
                    <a href={`/api/photos/${photo.id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- moderator-only/gated image served from an authenticated route, not a next/image candidate */}
                      <img
                        src={`/api/photos/${photo.id}`}
                        alt={`Correction photo ${i + 1}`}
                        className="h-28 w-full rounded object-cover"
                      />
                    </a>
                    <p className="mt-1.5 font-label text-xs text-foreground/70">{formatGpsSignal(photo.gpsDistanceMeters)}</p>
                    <p className="font-label text-xs text-foreground/70">{formatCapturedAgeSignal(photo.capturedAgeHours)}</p>
                    <p className="mt-1 font-label text-xs text-amber">Submitted with correction</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-4">
            <CollapsibleSection title="History" defaultOpen>
              {camera.history.length === 0 && (
                <p className="text-sm text-foreground/50">No history events yet.</p>
              )}
              <ol className="flex flex-col gap-2">
                {camera.history.map((event) => (
                  <li key={event.id} className="rounded border border-foreground/10 px-3 py-2 text-sm">
                    <p className="font-label text-xs text-foreground/50">
                      {dateFormatter.format(event.date)} - {HISTORY_EVENT_LABEL[event.eventType]}
                    </p>
                    {event.note && <p className="mt-1 text-foreground/85">{event.note}</p>}
                  </li>
                ))}
              </ol>
            </CollapsibleSection>

            <CollapsibleSection title="Moderation actions">
              {camera.moderationActions.length === 0 && (
                <p className="text-sm text-foreground/50">No moderator decisions yet.</p>
              )}
              <ol className="flex flex-col gap-2">
                {camera.moderationActions.map((action) => (
                  <li key={action.id} className="rounded border border-foreground/10 px-3 py-2 text-sm">
                    <p className="font-label text-xs text-foreground/50">
                      {dateFormatter.format(action.createdAt)} - {ACTION_TYPE_LABEL[action.action]} by{" "}
                      {action.actor.name ?? action.actor.email ?? "Unknown moderator"} ({REASON_CODE_LABEL[action.reasonCode]})
                      {action.auditLogEntry?.revertedAt && (
                        <Badge tone="error" className="ml-2">
                          REVERTED
                        </Badge>
                      )}
                    </p>
                    {action.note && <p className="mt-1 text-foreground/85">{action.note}</p>}
                  </li>
                ))}
              </ol>
            </CollapsibleSection>

            <CollapsibleSection title="Audit log">
              {auditLog.length === 0 && <p className="text-sm text-foreground/50">No audit entries yet.</p>}
              <ol className="flex flex-col gap-2">
                {auditLog.map((entry) => {
                  const afterRows = formatAuditPayload(entry.after);
                  const isHead = headEntryIdByEntity.get(`${entry.entityType}:${entry.entityId}`) === entry.id;
                  return (
                    <li key={entry.id} className="rounded border border-foreground/10 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-label text-xs text-foreground/50">
                          {dateTimeFormatter.format(entry.createdAt)} - {AUDIT_ACTION_LABEL[entry.action]} by{" "}
                          {entry.actor.name ?? entry.actor.email ?? "Unknown"}
                          {entry.revertedAt && (
                            <Badge tone="error" className="ml-2">
                              REVERTED
                            </Badge>
                          )}
                        </p>
                        {isAdmin && isHead && entry.revertedAt === null && (
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
                      {entry.summary && <p className="mt-1 text-foreground/85">{entry.summary}</p>}
                      {afterRows.length > 0 && (
                        <p className="mt-1 font-label text-xs text-foreground/50">
                          {afterRows.map((row) => `${row.label}: ${row.text}`).join(" - ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CollapsibleSection>

            <CollapsibleSection title="Moderator notes" defaultOpen>
              {camera.internalNotes.length === 0 && (
                <p className="text-sm text-foreground/50">No notes yet.</p>
              )}
              <ol className="flex flex-col gap-2">
                {camera.internalNotes.map((note) => (
                  <li key={note.id} className="rounded border border-foreground/10 px-3 py-2 text-sm">
                    <p className="font-label text-xs text-foreground/50">
                      {dateFormatter.format(note.createdAt)} - {note.author.name ?? note.author.email ?? "Unknown moderator"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground/85">{note.body}</p>
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
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </>
  );
}
