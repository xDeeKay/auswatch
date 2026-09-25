import type { Metadata } from "next";
import Link from "next/link";
import SubmissionForm from "@/components/SubmissionForm";

export const metadata: Metadata = {
  title: "AusWatch - Submit a Camera",
};

export default function ReportPage() {
  return (
    <div className="px-6 py-6">
      <main className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <h1 className="font-heading text-lg text-foreground">Submit a Camera</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Submit only surveillance infrastructure visible from a public place. Submissions
            are moderated before appearing on the public map, and markers on sensitive sites
            are excluded on principle.
          </p>
          <p className="mt-2 text-sm text-foreground/70">
            No account required. We don&rsquo;t ask for your name or email, and your IP
            address is never stored, only a hashed signal used to prevent spam.
          </p>
          <p className="mt-2 text-sm text-foreground/70">
            Not sure what you&rsquo;re looking at? See the{" "}
            <Link
              href="/spotting-guide"
              className="text-foreground underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber"
            >
              spotting guide
            </Link>{" "}
            for how to tell types apart.
          </p>
        </header>
        <SubmissionForm />
      </main>
    </div>
  );
}
