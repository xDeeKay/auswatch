import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicCameraById } from "@/lib/cameras";
import {
  CAPTURE_LABEL,
  HISTORY_EVENT_LABEL,
  OPERATOR_CATEGORY_LABEL,
  STATE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
} from "@/lib/camera-labels";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const camera = await getPublicCameraById(id);
  if (!camera) return { title: "AusWatch - Record not found" };
  const operatorLabel = camera.operator || OPERATOR_CATEGORY_LABEL[camera.operatorCategory];
  return { title: `AusWatch - ${TYPE_LABEL[camera.type]} - ${operatorLabel}` };
}

export default async function CameraRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const camera = await getPublicCameraById(id);

  if (!camera) {
    notFound();
  }

  return (
    <div className="px-6 pt-5 pb-10">
      <main className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">{TYPE_LABEL[camera.type].toUpperCase()}</Badge>
            <span className="font-label text-xs text-foreground/50">
              id {camera.id} &middot; first sighted {dateFormatter.format(camera.createdAt)}
            </span>
          </div>
          <h1 className="font-heading text-xl text-foreground">
            {camera.operator || OPERATOR_CATEGORY_LABEL[camera.operatorCategory]}
          </h1>
        </div>

        <div className="grid gap-8 sm:grid-cols-[2fr_1fr]">
          <section className="flex flex-col gap-6">
            <div>
              <h2 className="font-heading text-base text-foreground">History</h2>
              {camera.history.length === 0 ? (
                <p className="mt-2 text-sm text-foreground/50">No history events recorded yet.</p>
              ) : (
                <ol className="mt-3 flex flex-col gap-3 border-l border-amber/30 pl-4">
                  {camera.history.map((event) => (
                    <li key={event.id}>
                      <p className="font-label text-xs text-foreground/50">{dateFormatter.format(event.date)}</p>
                      <p className="text-sm text-foreground">{HISTORY_EVENT_LABEL[event.eventType]}</p>
                      {event.note && <p className="text-sm text-foreground/70">{event.note}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {camera.notes && (
              <div>
                <h2 className="font-heading text-base text-foreground">Notes</h2>
                <p className="mt-2 text-sm text-foreground/70">{camera.notes}</p>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4 rounded border border-foreground/10 p-4 text-sm">
            <div>
              <p className="font-label text-xs text-foreground/50">OPERATOR CATEGORY</p>
              <p className="mt-1 text-foreground/85">{OPERATOR_CATEGORY_LABEL[camera.operatorCategory]}</p>
            </div>
            {camera.operator && (
              <div>
                <p className="font-label text-xs text-foreground/50">OWNER / OPERATOR</p>
                <p className="mt-1 text-foreground/85">{camera.operator}</p>
              </div>
            )}
            <div>
              <p className="font-label text-xs text-foreground/50">COORDINATES</p>
              <p className="mt-1 font-label text-foreground/85">
                {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
              </p>
            </div>
            <div>
              <p className="font-label text-xs text-foreground/50">STATE/TERRITORY</p>
              <p className="mt-1 text-foreground/85">{camera.state ? STATE_LABEL[camera.state] : "Unknown"}</p>
            </div>
            <div>
              <p className="font-label text-xs text-foreground/50">STATUS</p>
              <p className="mt-1 text-foreground/85">{STATUS_LABEL[camera.status]}</p>
            </div>
            <div>
              <p className="font-label text-xs text-foreground/50">APPEARS TO CAPTURE</p>
              <p className="mt-1 text-foreground/85">{CAPTURE_LABEL[camera.captures]}</p>
            </div>

            <div className="mt-2 flex flex-col gap-2 border-t border-foreground/10 pt-4">
              <Button href={`/report/correction/${camera.id}`} size="sm">
                Report an error
              </Button>
              <Button href="/map" tone="secondary" size="sm">
                Back to the map
              </Button>
            </div>
          </aside>
        </div>

        <footer className="flex gap-4 border-t border-foreground/10 pt-6">
          <Link
            href="/about"
            className="font-label text-xs text-foreground/70 underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
          >
            About AusWatch
          </Link>
        </footer>
      </main>
    </div>
  );
}
