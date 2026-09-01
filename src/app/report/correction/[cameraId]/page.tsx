import Link from "next/link";
import CorrectionForm from "@/components/CorrectionForm";
import { getVerifiedCameraById } from "@/lib/cameras";

const linkClass =
  "text-parchment underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export default async function CorrectionPage({
  params,
}: {
  params: Promise<{ cameraId: string }>;
}) {
  const { cameraId } = await params;
  const camera = await getVerifiedCameraById(cameraId);

  if (!camera) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Camera not found</h1>
        <p className="text-sm text-parchment/70">
          This marker isn't currently on the verified public map.
        </p>
        <Link href="/" className={linkClass}>
          Back to the map
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
        <h1 className="font-heading text-lg text-parchment">Suggest a correction</h1>
        <p className="mt-2 text-sm text-parchment/70">
          Propose a fix to this marker's details or position. Corrections are
          moderated before they take effect, even if you were the original submitter.
        </p>
      </header>
      <CorrectionForm camera={camera} />
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
