import type { Metadata } from "next";
import { signIn } from "@/auth";

export const metadata: Metadata = {
  title: "AusWatch - Sign in",
};

export default async function ModeratorSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
      <p className="font-label text-xs text-foreground/50">AusWatch</p>
      <h1 className="font-heading text-lg text-foreground">Moderator sign in</h1>

      {error === "AccessDenied" && (
        <p className="text-sm text-error">
          Your GitHub account isn&rsquo;t on the moderator list.
        </p>
      )}

      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/moderate" });
        }}
      >
        <button
          type="submit"
          className="rounded border border-amber bg-amber/10 px-4 py-2 font-label text-sm text-amber transition hover:bg-amber/20"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
