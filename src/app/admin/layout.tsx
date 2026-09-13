import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/moderator-access";
import { AuthGate } from "@/components/ui/AuthGate";
import { ModNav } from "@/components/mod/ModNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await requireAdmin();

  if (access.status !== "ok") {
    return <AuthGate audience="admin" access={access} />;
  }

  return (
    <>
      <ModNav role={access.profile.role} userLabel={access.profile.email} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">{children}</main>
    </>
  );
}
