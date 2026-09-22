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
    <div className="flex h-screen flex-col">
      <ModNav role={access.profile.role} userLabel={access.profile.email} />
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">{children}</main>
      </div>
    </div>
  );
}
