import { getCameras } from "@/lib/cameras";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" });

export default async function LandingPage() {
  const cameras = await getCameras();
  const activeCount = cameras.filter((c) => c.status === "active").length;
  const removedCount = cameras.filter((c) => c.status === "removed").length;
  const lastAdded = cameras.reduce<Date | null>(
    (latest, camera) => (!latest || camera.createdAt > latest ? camera.createdAt : latest),
    null
  );

  const stats = [
    { value: activeCount.toLocaleString("en-AU"), label: "CAMERAS ACTIVE" },
    { value: removedCount.toLocaleString("en-AU"), label: "CAMERAS REMOVED" },
    { value: lastAdded ? dateFormatter.format(lastAdded) : "-", label: "LAST RECORD ADDED" },
  ];

  return (
    <main className="flex flex-col">
      <section className="border-b border-parchment/10 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <p className="font-label text-xs text-amber">VOLUNTEER-RUN &middot; MODERATED &middot; OPEN LICENSE</p>
          <h1 className="max-w-2xl font-heading text-3xl leading-tight text-parchment sm:text-4xl">
            A Public Record of Surveillance Infrastructure Across Australia
          </h1>
          <p className="max-w-xl text-sm font-semibold leading-relaxed text-parchment/85">
            You can&rsquo;t opt out of a camera you don&rsquo;t know exists.
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-parchment/70">
            AusWatch records the cameras, plate readers, and recognition systems installed in
            public spaces. We document the camera type, who operates it, what it appears to
            capture, and whether it ever gets taken down. Every record is logged by a volunteer
            and moderated before publication. Submissions are completely anonymous and
            account-free; we never collect or store your personal information.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/map">Explore Map</Button>
            <Button href="/report" tone="secondary">
              Submit Camera
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-parchment/10 px-6 py-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 text-center min-[480px]:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-label text-2xl text-parchment">{stat.value}</p>
              <p className="mt-1 font-label text-xs text-parchment/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Card density="cozy" className="flex flex-col gap-4 border-parchment/10">
            <p className="font-label text-xs text-parchment/50">WHAT WE TRACK</p>
            <ul className="flex flex-col gap-2 text-sm text-parchment/70">
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                CCTV Cameras
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                Speed Cameras
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                ALPR / Plate Readers
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                Facial Recognition
              </li>
            </ul>
          </Card>
          <Card density="cozy" className="flex flex-col gap-4 border-parchment/10">
            <p className="font-label text-xs text-parchment/50">HOW A RECORD IS MADE</p>
            <ul className="flex flex-col gap-2 text-sm text-parchment/70">
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                A contributor reports a device visible from public land
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                A moderator reviews the submission for accuracy and safety
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                Once live, the record&rsquo;s status is tracked over time
              </li>
            </ul>
          </Card>
          <Card density="cozy" className="flex flex-col gap-4 border-parchment/10">
            <p className="font-label text-xs text-parchment/50">WHAT WE DON&rsquo;T PUBLISH</p>
            <ul className="flex flex-col gap-2 text-sm text-parchment/70">
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                Reporter identities
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                Devices inside private residences
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber/70" />
                Anything on our sensitive-site exclusion list
              </li>
            </ul>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
