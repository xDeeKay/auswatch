import type { ModeratorAccessResult } from "@/lib/moderator-access";
import { Button } from "@/components/ui/Button";

const COPY = {
  moderator: {
    unauthenticated: { title: "Moderator sign in required", body: null },
    forbidden: {
      title: "Access revoked",
      body: "Your moderator access has been revoked or is no longer active.",
    },
  },
  admin: {
    unauthenticated: { title: "Admin sign in required", body: "Sign in with a moderator account that has admin privileges." },
    forbidden: { title: "Admin access required", body: "This area is restricted to admins." },
  },
} as const;

export function AuthGate({
  audience,
  access,
}: {
  audience: "moderator" | "admin";
  access: Extract<ModeratorAccessResult, { status: "unauthenticated" | "forbidden" }>;
}) {
  const copy = COPY[audience][access.status];

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
      <p className="font-label text-xs text-foreground/50">AusWatch</p>
      <h1 className="font-heading text-lg text-foreground">{copy.title}</h1>
      {copy.body && <p className="text-sm text-foreground/70">{copy.body}</p>}
      <Button href="/moderate/sign-in">Go to sign in</Button>
    </main>
  );
}
