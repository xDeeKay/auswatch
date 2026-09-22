import { PublicNav } from "@/components/PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <PublicNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
