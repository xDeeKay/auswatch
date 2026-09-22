import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AusWatch - Privacy Policy",
  description: "What AusWatch collects, from whom, and why.",
};

const linkClass =
  "text-parchment underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export default function PrivacyPage() {
  return (
    <>
      <div className="px-6 py-6">
        <main className="mx-auto flex max-w-5xl flex-col divide-y divide-parchment/10 [&>*+*]:mt-5 [&>*+*]:pt-5">
          <header>
            <h1 className="font-heading text-lg text-parchment">Privacy Policy</h1>
            <p className="mt-4 text-sm leading-relaxed text-parchment/70">
              AusWatch documents surveillance of the public. It tries to collect as little as
              possible about the public in return.
            </p>
          </header>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">If you submit a camera or correction</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Reporting never requires an account. We don&rsquo;t ask for your name or email, and
              we never store your IP address. Instead, a hashed signal derived from your device is
              recorded, used only to keep the review queue free of spam and duplicate submissions.
              That signal can&rsquo;t be reversed back into an IP address or used to identify you.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              Once a submission is approved, its content (location, type, operator, notes) becomes
              part of the public dataset. Nothing about who submitted it is ever published or
              visible to other users.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">If you&rsquo;re a moderator or admin</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Moderators and admins sign in with GitHub. We store the name and email your GitHub
              account provides, solely to authenticate you and to attribute moderation decisions in
              the internal audit log (so every verify, removal, or edit is traceable to the account
              that made it).
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              This information is never shown to the public or to reporters.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Cookies</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              AusWatch sets a session cookie only for signed-in moderators and admins, so they stay
              logged in between requests. Reporters browsing or submitting to the public site are
              never cookied.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              We don&rsquo;t run analytics, advertising, or tracking scripts of any kind.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Data retention</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Published camera records and their moderation history are kept indefinitely as part
              of the public record &mdash; that history (including removals) is the point of
              AusWatch.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              The hashed spam-prevention signal tied to a submission is kept only as long as
              it&rsquo;s useful for that purpose.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">What we don&rsquo;t do</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              We don&rsquo;t sell or share data with third parties, run ads, or build profiles of
              visitors.
            </p>
            <p className="text-sm leading-relaxed text-parchment/70">
              AusWatch has no funding model that depends on your data.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Changes to this policy</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              We may update this policy as the project grows. Material changes will be reflected
              here with an updated date.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base text-parchment">Contact</h2>
            <p className="text-sm leading-relaxed text-parchment/70">
              Questions about this policy:{" "}
              <a className={linkClass} href="mailto:contact@auswatch.org">
                contact@auswatch.org
              </a>
              . See also our{" "}
              <Link href="/terms" className={linkClass}>
                Terms of Service
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
