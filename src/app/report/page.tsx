import Link from "next/link";
import SubmissionForm from "@/components/SubmissionForm";

const linkClass =
  "text-parchment underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export default function ReportPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Report a camera</h1>
        <p className="mt-2 text-sm text-parchment/70">
          Submit only surveillance infrastructure visible from a public place. Submissions
          are moderated before appearing on the public map, and markers on sensitive sites
          are excluded on principle.
        </p>
        <p className="mt-2 text-sm text-parchment/70">
          No account required. We don&rsquo;t ask for your name or email, and your IP
          address is never stored, only a hashed signal used to prevent spam.
        </p>
      </header>
      <SubmissionForm />
      <footer className="flex gap-4 border-t border-parchment/10 pt-6">
        <Link href="/" className={linkClass}>
          View the map
        </Link>
        <Link href="/about" className={linkClass}>
          About AusWatch
        </Link>
      </footer>
    </main>
  );
}
