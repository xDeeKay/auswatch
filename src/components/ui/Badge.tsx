import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "amber" | "neutral" | "error";

const TONE_CLASS: Record<BadgeTone, string> = {
  amber: "border-amber/40 text-amber",
  neutral: "border-foreground/30 text-foreground/70",
  error: "border-error/40 text-error",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-label text-xs",
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
