import type { Metadata } from "next";
import CorrectionForm from "@/components/CorrectionForm";
import { getVerifiedCameraById } from "@/lib/cameras";

export const metadata: Metadata = {
  title: "AusWatch - Correction",
};

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
        <h1 className="font-heading text-lg text-parchment">Camera not found</h1>
        <p className="text-sm text-parchment/70">
          This marker isn&apos;t currently on the verified public map.
        </p>
      </main>
    );
  }

  return (
    <div className="px-6 pt-5 pb-10">
      <main className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <h1 className="font-heading text-lg text-parchment">Suggest a correction</h1>
          <p className="mt-2 text-sm text-parchment/70">
            Propose a fix to this marker&apos;s details or position. Corrections are
            moderated before they take effect, even if you were the original submitter.
          </p>
          <p className="mt-2 text-sm text-parchment/70">
            No account required. We don&rsquo;t ask for your name or email, and your IP
            address is never stored, only a hashed signal used to prevent spam.
          </p>
        </header>
        <CorrectionForm camera={camera} />
      </main>
    </div>
  );
}
