import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AusWatch - About",
  description:
    "Why AusWatch exists, what it documents, and what it deliberately does not do.",
};

const linkClass =
  "text-foreground underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export default function AboutPage() {
  return (
    <>
      <div className="px-6 py-6">
        <main className="mx-auto flex max-w-5xl flex-col divide-y divide-foreground/10 [&>*+*]:mt-5 [&>*+*]:pt-5">
          <header>
            <h1 className="font-heading text-lg text-foreground">Why AusWatch exists</h1>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">
              You can&rsquo;t opt out of a camera you don&rsquo;t know exists.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">
              Across Australia, automated surveillance is expanding. None of it is hidden
              exactly: it&rsquo;s mounted on poles, tunnels, and shopfronts in plain sight. But
              there&rsquo;s no single place that tells you a camera&rsquo;s location, who put it
              there, what it captures, and whether it ever gets taken down.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">
              <strong className="text-foreground">AusWatch</strong> is that place, built and
              maintained by the public that&rsquo;s being watched.
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">
              What&rsquo;s actually happening right now
            </h2>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">
                Facial recognition is moving from retail into policing.
              </p>
              <p className="text-sm leading-relaxed text-foreground/70">
                In June 2026,{" "}
                <a
                  className={linkClass}
                  href="https://www.abc.net.au/news/2026-06-19/live-facial-recognition-technology-to-be-used-by-wa-police/106817264"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WA Police became the first force in the country to trial live facial recognition
                </a>
                : a marked van scanning the faces of people in crowds around Perth and Fremantle
                and matching them in real time against{" "}
                <a
                  className={linkClass}
                  href="https://www.abc.net.au/news/2026-08-11/ai-police-face-screening-trial-sparks-privacy-concern/107009644"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  a watchlist of about 4,000 people, scanning over 130,000 faces in its first week
                  alone
                </a>
                . WA&rsquo;s own privacy regulator was briefed and invited to observe, but
                declined, saying it didn&rsquo;t want to appear to endorse the trial.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">
                Retailers have already been found in breach.
              </p>
              <p className="text-sm leading-relaxed text-foreground/70">
                <a
                  className={linkClass}
                  href="https://www.oaic.gov.au/news/media-centre/privacy-commissioner-statement-on-administrative-review-tribunals-bunnings-decision"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Privacy Commissioner originally ruled that Bunnings breached the privacy of
                  potentially hundreds of thousands of shoppers
                </a>{" "}
                by scanning every customer&rsquo;s face on entry.{" "}
                <a
                  className={linkClass}
                  href="https://www.abc.net.au/news/2026-02-05/bunnings-wins-ai-facial-recognition-tech-fight/106309308"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  On appeal, the tribunal found Bunnings was entitled to use the technology, while
                  still requiring clearer notice to customers
                </a>
                , a result the Commissioner says still sets &ldquo;a high bar&rdquo; for facial
                recognition in Australia.{" "}
                <a
                  className={linkClass}
                  href="https://www.oaic.gov.au/news/media-centre/18-kmarts-use-of-facial-recognition-to-tackle-refund-fraud-unlawful,-privacy-commissioner-finds"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kmart was separately found to have collected shoppers&rsquo; biometric data
                  without notice or consent
                </a>
                .{" "}
                <a
                  className={linkClass}
                  href="https://www.abc.net.au/news/2026-08-17/coles-and-woolworths-to-test-facial-recognition-technology/107045036"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Woolworths and Coles have both been reported testing similar systems
                </a>
                . Public concern is rising with it: in the{" "}
                <a
                  className={linkClass}
                  href="https://www.oaic.gov.au/engage-with-us/research-and-training-resources/research/australian-community-attitudes-to-privacy-survey/australian-community-attitudes-to-privacy-survey2026"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Australian Community Attitudes to Privacy Survey, the share of Australians who
                  name facial recognition as one of the biggest privacy risks they face jumped from
                  27% in 2023 to 45% in 2026
                </a>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-amber/40 pl-4">
              <p className="text-sm font-semibold text-foreground">
                Average-speed and plate-reading cameras are spreading state by state.
              </p>
              <p className="text-sm leading-relaxed text-foreground/70">
                <a
                  className={linkClass}
                  href="https://www.nsw.gov.au/ministerial-releases/average-speed-cameras-switch-to-enforcement-mode-for-both-heavy-and-light-vehicles-under-road-safety-trial"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NSW is trialling average-speed enforcement for light vehicles for the first time,
                  at two regional highway sites
                </a>
                , with average-speed cameras already active for heavy vehicles in the WestConnex
                tunnels.{" "}
                <a
                  className={linkClass}
                  href="https://www.vic.gov.au/point-point-road-safety-cameras"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Victoria
                </a>{" "}
                and Queensland already run average-speed and ALPR systems covering all vehicle
                types on key routes.{" "}
                <a
                  className={linkClass}
                  href="https://au.news.yahoo.com/states-major-speed-camera-move-reflects-growing-trend-across-australia-204058221.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tasmania
                </a>
                , Victoria, Queensland and{" "}
                <a
                  className={linkClass}
                  href="https://www.abc.net.au/news/2026-04-21/fines-withdrawn-as-ai-road-safety-camera-controversy-continues/106587938"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WA
                </a>{" "}
                have all recently expanded or upgraded their camera networks: more units, longer
                operating hours, and in some cases AI detection layered on top of speed
                enforcement.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-foreground/70">
              Individually, each of these is usually announced, debated, sometimes challenged.
            </p>
            <p className="text-sm leading-relaxed text-foreground/70">
              What&rsquo;s missing is the aggregate picture, and what happens to a camera after
              the headline fades. Systems get quietly discontinued, relocated, or renewed with no
              public follow-up either way.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">What AusWatch does</h2>
            <p className="text-sm leading-relaxed text-foreground/70">
              AusWatch documents surveillance cameras as public-interest infrastructure with a
              full lifecycle. Every submission gets tracked the same way:
            </p>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="font-label text-xs text-amber">WHAT IT IS</dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Type, likely capability, and what it appears to record.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">
                  WHO&rsquo;S RESPONSIBLE
                </dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  Council, state police, private operator, or unknown.
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">
                  WHEN IT APPEARED
                </dt>
                <dd className="mt-1 text-sm text-foreground/70">The first confirmed sighting.</dd>
              </div>
              <div>
                <dt className="font-label text-xs text-amber">
                  WHETHER IT&rsquo;S STILL THERE
                </dt>
                <dd className="mt-1 text-sm text-foreground/70">
                  And if not, when and why it came down.
                </dd>
              </div>
            </dl>
            <p className="text-sm leading-relaxed text-foreground/70">
              A camera that gets quietly switched off after community pressure is as much a part
              of the record as one that goes up.
            </p>
            <p className="text-sm leading-relaxed text-foreground/70">
              That&rsquo;s the record AusWatch keeps.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">Licence</h2>
            <p className="text-sm leading-relaxed text-foreground/70">
              The AusWatch dataset (verified camera records and their history) is released under a{" "}
              <a
                className={linkClass}
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Creative Commons Attribution 4.0 International licence
              </a>
              . Anyone can reuse, redistribute, or build on it, including commercially, as long as
              AusWatch is credited.
            </p>
            <p className="text-sm leading-relaxed text-foreground/70">
              See the{" "}
              <Link href="/terms" className={linkClass}>
                Terms of Service
              </Link>{" "}
              for details.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-foreground">What AusWatch is not</h2>
            <p className="text-sm leading-relaxed text-foreground/70">
              It&rsquo;s not a tool for evading enforcement, and it&rsquo;s not a claim that any
              specific camera is doing something unlawful. AusWatch documents what&rsquo;s
              publicly observable: a camera exists, here&rsquo;s what&rsquo;s visible about it,
              and lets people draw their own conclusions. Submissions are moderated, and markers
              on sensitive sites are excluded on principle, not just for legal cover.
            </p>
            <p className="text-sm leading-relaxed text-foreground/70">
              Reporting a camera never requires an account. AusWatch doesn&rsquo;t collect
              submitters&rsquo; names, emails, or IP addresses, only a hashed signal used to
              keep the review queue free of spam.
            </p>
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
