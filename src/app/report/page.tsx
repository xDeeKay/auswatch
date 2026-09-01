import SubmissionForm from "@/components/SubmissionForm";

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
      </header>
      <SubmissionForm />
    </main>
  );
}
