import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AusWatch - Spotting Guide",
  description:
    "How to identify surveillance cameras and note what they appear to capture, for accurate reporting.",
};

const linkClass =
  "text-foreground underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export default function SpottingGuidePage() {
  return (
    <>
      <div className="px-6 py-6">
        <main className="mx-auto flex max-w-5xl flex-col divide-y divide-foreground/10 [&>*+*]:mt-5 [&>*+*]:pt-5">
          <header>
            <h1 className="font-heading text-lg text-foreground">How to Spot a Camera</h1>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">
              This is a guide to identifying surveillance infrastructure from a public vantage
              point, not a way to avoid it.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">
              AusWatch documents what&rsquo;s publicly observable, so everything below is about
              visual cues, not a confirmed technical capability. Use it before you{" "}
              <Link href="/report" className={linkClass}>
                submit a camera
              </Link>{" "}
              so the type and capture fields on the report form match what you can actually see.
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">
              General cues, before you narrow it down
            </h2>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="font-label text-xs text-amber">MOUNTING</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  A pole, a building facade, a traffic light or gantry, or a vehicle or trailer all
                  suggest different purposes. A fixed pole on a quiet street reads differently to a
                  gantry spanning a highway.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">HOUSING SHAPE</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Small dome housings are common for general CCTV. Boxy housings, especially paired
                  with a flash or a radar unit, point to speed or plate enforcement.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">ORIENTATION</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Aimed along a lane of traffic suggests plates or speed. Aimed at a doorway,
                  checkout, or footpath at head height suggests faces or general footage.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">EXTRA HARDWARE</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  An infrared illuminator ring around the lens, a separate radar unit, or a flash
                  housing are enforcement-camera tells, not general CCTV.
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">By type</h2>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">CCTV Camera</p>
              <p className="text-sm leading-relaxed text-foreground/70">
                The broadest category: dome or bullet housings on shopfronts, public buildings, car
                parks and transport hubs. Usually a wide field of view rather than aimed at a
                single lane or entry point. If a camera doesn&rsquo;t clearly match one of the
                categories below, this is usually the right default, alongside a captures value of
                General Footage or Unclear.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">Speed Camera</p>
              <p className="text-sm leading-relaxed text-foreground/70">
                Fixed roadside or gantry-mounted units, often boxy, sometimes paired with a visible
                flash housing or a separate radar or lidar unit. Overhead gantries spanning
                multiple lanes are common on highways. Average-speed (point-to-point) enforcement
                uses two matched units at separate locations rather than one, so a lone unit and a
                matched pair further down the same road can both be genuine. Mobile units are
                trailer- or van-mounted and move between sites.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">ALPR / Plate Reader</p>
              <p className="text-sm leading-relaxed text-foreground/70">
                Often mounted at chokepoints: intersections, tunnel entries and exits, car park
                boom gates, or fixed points on arterial roads. Look for an infrared illuminator
                ring around the lens, used to read plates clearly at night or at speed. Government
                plate-reading networks and mobile police ALPR units (roof- or dash-mounted on a
                marked or unmarked vehicle) both fall in this category.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">Facial Recognition</p>
              <p className="text-sm leading-relaxed text-foreground/70">
                Harder to identify by hardware alone, since the camera itself can look like
                ordinary CCTV. Context is the main signal: a small, discreetly placed camera near a
                retail entry or checkout, or a marked vehicle carrying visible camera equipment and
                used to scan crowds in real time. Don&rsquo;t assume facial recognition just
                because a business has cameras at its entrance; that&rsquo;s most often general
                CCTV, or Unclear if you can&rsquo;t tell.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">Other</p>
              <p className="text-sm leading-relaxed text-foreground/70">
                For anything that doesn&rsquo;t fit cleanly, such as unusual sensor types or
                equipment you can&rsquo;t identify. Choose this over guessing at one of the
                categories above.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">
              What it appears to capture
            </h2>
            <p className="text-sm leading-relaxed text-foreground/70">
              This field is about what the camera looks aimed at, not a claim about what it
              technically records. Pick the option that matches what you can see.
            </p>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="font-label text-xs text-amber">GENERAL FOOTAGE</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Wide-angle, general-purpose coverage of an area, not obviously aimed at faces or
                  plates specifically.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">NUMBER PLATES</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Aimed along a lane of traffic at plate height, often with an illuminator ring.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">FACES</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Aimed at head height toward an entry, checkout, footpath or crowd.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">PLATES AND FACES</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Positioned to plausibly capture both, for example a wide-angle unit at a vehicle
                  entry with a walkway alongside.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">UNCLEAR</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  The honest answer whenever the above don&rsquo;t fit. A correction can refine it
                  later; a guess that turns out wrong is more work to undo than an honest Unclear.
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">Before you submit</h2>
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/70">
              <li>Only report cameras visible from a public place.</li>
              <li>
                Skip anything at or near a domestic violence shelter, school or childcare centre,
                military or correctional facility, embassy, or private residence. These are
                excluded on principle regardless of visibility, see the{" "}
                <Link href="/terms" className={linkClass}>
                  Terms of Service
                </Link>
                .
              </li>
              <li>
                Describe the infrastructure, not a claim about a named individual or specific
                business&rsquo;s conduct.
              </li>
              <li>
                If you&rsquo;re not sure, submit with Unclear rather than guessing, or leave it for
                someone else to confirm.
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-foreground/70">
              <Link href="/report" className={linkClass}>
                Submit a camera &rarr;
              </Link>
            </p>
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
