import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AusWatch - Terms of Service",
  description: "The terms that govern using auswatch.org and reusing the AusWatch dataset.",
};

const linkClass =
  "text-parchment underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export default function TermsPage() {
  return (
    <>
      <div className="px-6 py-6">
        <main className="mx-auto flex max-w-5xl flex-col divide-y divide-parchment/10 [&>*+*]:mt-5 [&>*+*]:pt-5">
          <header>
            <h1 className="font-heading text-lg text-parchment">Terms of Service</h1>
            <p className="mt-4 text-sm leading-relaxed text-parchment/70">
              AusWatch is a volunteer-run, community project. Using auswatch.org, or submitting to
              it, means you agree to these terms.
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Submitting to AusWatch</h2>
            <p className="text-sm leading-relaxed text-parchment/70">By submitting a camera or a correction, you agree to:</p>
            <ol className="flex flex-col gap-2 text-sm leading-relaxed text-parchment/70">
              <li>1. Submit only surveillance infrastructure visible from a public place.</li>
              <li>2. Not submit markers for excluded categories: shelters, schools, defence and correctional sites, private residences, embassies, and other sensitive sites.</li>
              <li>3. Not include personal information about identifiable individuals in notes or operator fields.</li>
              <li>
                4. Describe only what&rsquo;s publicly observable, not confirmed technical
                capability &mdash; say what a camera appears to do, not what it definitely does.
              </li>
              <li>5. Accept that AusWatch may reject or remove any marker, without notice, that it determines falls outside this policy.</li>
            </ol>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">The AusWatch dataset</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Verified camera records and their history are released under a{" "}
              <a
                className={linkClass}
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Creative Commons Attribution 4.0 International licence (CC BY 4.0)
              </a>
              . You may copy, redistribute, remix, and build on the dataset for any purpose,
              including commercially, as long as you credit AusWatch and link back to
              auswatch.org.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              CC BY 4.0 does not let us add further restrictions on top of that, so AusWatch
              cannot prevent a specific downstream use of the licensed data once you have it. Our
              own non-goals for the project (see below) describe what we won&rsquo;t build
              ourselves, not a licence condition on the data.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              The application that runs auswatch.org (the site and its source code) is not covered
              by this licence.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Using the site itself</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Separate from the dataset licence, you agree not to attempt to circumvent moderation
              or the sensitive-site exclusion list.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              You also agree not to scrape or bulk-download the live site in a way that degrades it
              for other users, rather than using an exported copy of the dataset.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              And you agree not to use auswatch.org to harass, identify, or locate a specific
              private individual.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">What AusWatch doesn&rsquo;t do</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              AusWatch documents publicly observable infrastructure.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              It is not a route-avoidance or enforcement-evasion tool, does not run ads or sell
              data, and does not confirm a camera&rsquo;s actual technical capability &mdash; only
              what&rsquo;s visible about it.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">No warranty</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              AusWatch is provided as-is, maintained by volunteers on a best-effort basis.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              We make no guarantee that any record is complete, current, or free of error, and
              accept no liability for decisions made based on it.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Changes to these terms</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              We may update these terms as the project grows. Material changes will be reflected
              here with an updated date.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Contact</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Questions about these terms, or a takedown request:{" "}
              <a className={linkClass} href="mailto:legal@auswatch.org">
                legal@auswatch.org
              </a>
              . See also our{" "}
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
