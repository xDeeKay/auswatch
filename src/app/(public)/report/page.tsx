import type { Metadata } from "next";
import SubmissionForm from "@/components/SubmissionForm";

export const metadata: Metadata = {
  title: "AusWatch - Submit a Camera",
};

export default function ReportPage() {
  return (
    <div className="px-6 pt-5 pb-10">
      <main className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <h1 className="font-heading text-lg text-parchment">Submit a Camera</h1>
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
      </main>
    </div>
  );
}
