import { signIn } from "@/auth";

export default async function ModeratorSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-parchment/50">AUSWATCH</p>
      <h1 className="font-heading text-lg text-parchment">Moderator sign in</h1>

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
          className="rounded border border-amber bg-amber/10 px-4 py-2 font-mono text-sm text-amber transition hover:bg-amber/20"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
