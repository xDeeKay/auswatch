import Link from "next/link";
import { AuState, CameraType, ModerationReasonCode, ModeratorRole, SensitiveSiteMatchSource } from "@/generated/prisma/enums";
import { TYPE_LABEL, CAPTURE_LABEL } from "@/lib/camera-labels";
import { REASON_CODE_LABEL, MATCH_SOURCE_LABEL, ZONE_CATEGORY_LABEL } from "@/lib/moderation-labels";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { verifyCamera, removeCamera } from "@/lib/actions/moderation";
import { requireModerator, canAct } from "@/lib/moderator-access";
import { listTickets, type TicketFilters, type TicketKind } from "@/lib/tickets";
import { parsePageParams } from "@/lib/pagination";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const selectClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";
const noteClass =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment placeholder:text-parchment/30 focus:border-amber focus:outline-none";
const filterSelectClass =
  "rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";

const PAGE_SIZE_OPTIONS = { defaultPageSize: 20, maxPageSize: 100 };

function isTicketKind(value: string | undefined): value is TicketKind {
  return value === "submission" || value === "correction";
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return new URLSearchParams(entries).toString();
}

export default async function ModeratePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; type?: string; kind?: string; page?: string }>;
}) {
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
  const isAdmin = profile.role === ModeratorRole.admin;

  const params = await searchParams;

  const filters: TicketFilters = {};
  if (params.state && (Object.values(AuState) as string[]).includes(params.state)) {
    filters.state = params.state as AuState;
  }
  if (params.type && (Object.values(CameraType) as string[]).includes(params.type)) {
    filters.cameraType = params.type as CameraType;
  }
  if (isTicketKind(params.kind)) {
    filters.kind = params.kind;
  }

  const pageParams = parsePageParams({ page: params.page }, PAGE_SIZE_OPTIONS);
  const result = await listTickets(profile, filters, pageParams);

  const availableStates = isAdmin
    ? Object.values(AuState)
    : Array.from(new Set(profile.grants.map((g) => g.state))).sort();
  const availableCameraTypes = isAdmin
    ? Object.values(CameraType)
    : Array.from(new Set(profile.grants.map((g) => g.cameraType))).sort();

  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Review queue</h1>
        <p className="mt-2 text-sm text-parchment/70">
          {result.total} pending ticket{result.total === 1 ? "" : "s"}
          {result.total > 0 && ` (showing ${rangeStart}-${rangeEnd})`}
        </p>
        <Link
          href="/moderate/cameras"
          className="mt-1 block font-mono text-xs text-parchment/50 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
        >
          Browse cameras &rarr;
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">STATE</label>
          <select name="state" defaultValue={params.state ?? ""} className={filterSelectClass}>
            <option value="">All states</option>
            {availableStates.map((state) => (
              <option key={state} value={state}>
                {STATE_LABEL[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">CAMERA TYPE</label>
          <select name="type" defaultValue={params.type ?? ""} className={filterSelectClass}>
            <option value="">All types</option>
            {availableCameraTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs tracking-[0.05em] text-amber">KIND</label>
          <select name="kind" defaultValue={params.kind ?? ""} className={filterSelectClass}>
            <option value="">New and corrections</option>
            <option value="submission">New submissions only</option>
            <option value="correction">Corrections only</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded border border-amber bg-amber/10 px-4 py-1.5 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Filter
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {result.items.map((ticket) =>
          ticket.kind === "submission" ? (
            <div key={`submission-${ticket.id}`} className="rounded border border-parchment/20 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-amber/40 px-1.5 py-0.5 font-mono text-xs tracking-[0.05em] text-amber">
                    NEW SUBMISSION
                  </span>
                  <h2 className="font-heading text-base text-parchment">{TYPE_LABEL[ticket.camera.type]}</h2>
                </div>
                <p className="font-mono text-xs text-parchment/50">
                  {dateFormatter.format(ticket.createdAt)}
                </p>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-xs tracking-[0.05em] text-amber">OPERATOR</dt>
                  <dd className="text-parchment/85">{ticket.camera.operator || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs tracking-[0.05em] text-amber">APPEARS TO CAPTURE</dt>
                  <dd className="text-parchment/85">{CAPTURE_LABEL[ticket.camera.captures]}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs tracking-[0.05em] text-amber">LOCATION</dt>
                  <dd className="font-mono text-parchment/85">
                    {ticket.camera.lat.toFixed(5)}, {ticket.camera.lng.toFixed(5)}
                    {ticket.state && ` (${STATE_LABEL[ticket.state]})`}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs tracking-[0.05em] text-amber">ID</dt>
                  <dd className="font-mono text-parchment/85">{ticket.camera.id}</dd>
                </div>
                {ticket.camera.notes && (
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-xs tracking-[0.05em] text-amber">NOTES</dt>
                    <dd className="text-parchment/85">{ticket.camera.notes}</dd>
                  </div>
                )}
              </dl>

              {ticket.camera.sensitiveSiteMatches.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {ticket.camera.sensitiveSiteMatches.map((match) =>
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

              {canAct(profile, { state: ticket.state, type: ticket.cameraType }) ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await verifyCamera(ticket.camera.id, formData);
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
                      await removeCamera(ticket.camera.id, formData);
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
          ) : (
            <Link
              key={`correction-${ticket.id}`}
              href={`/moderate/cameras/${ticket.cameraId}`}
              className="flex items-center justify-between rounded border border-parchment/20 p-4 transition hover:border-amber/40"
            >
              <div className="flex items-center gap-2">
                <span className="rounded border border-parchment/30 px-1.5 py-0.5 font-mono text-xs tracking-[0.05em] text-parchment/70">
                  CORRECTION
                </span>
                <div>
                  <p className="font-heading text-sm text-parchment">{TYPE_LABEL[ticket.camera.type]}</p>
                  <p className="font-mono text-xs text-parchment/50">{ticket.camera.operator || "Unknown"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-amber">
                  {ticket.state ? STATE_LABEL[ticket.state] : "Unresolved"}
                </p>
                <p className="font-mono text-xs text-parchment/50">{dateFormatter.format(ticket.createdAt)}</p>
              </div>
            </Link>
          )
        )}

        {result.items.length === 0 && (
          <p className="text-sm text-parchment/50">Nothing pending review right now.</p>
        )}
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-xs text-parchment/50">
          {result.page > 1 ? (
            <Link
              href={`?${buildQueryString({ ...params, page: String(result.page - 1) })}`}
              className="underline decoration-amber/50 underline-offset-2 hover:text-amber hover:decoration-amber"
            >
              &larr; Prev
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link
              href={`?${buildQueryString({ ...params, page: String(result.page + 1) })}`}
              className="underline decoration-amber/50 underline-offset-2 hover:text-amber hover:decoration-amber"
            >
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}
