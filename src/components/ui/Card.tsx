import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardDensity = "cozy" | "compact";

const DENSITY_CLASS: Record<CardDensity, string> = {
  cozy: "border-parchment/20 p-5",
  compact: "border-parchment/10 px-3 py-2 text-sm",
};

export function Card({
  density = "cozy",
  className,
  children,
}: {
  density?: CardDensity;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("rounded border", DENSITY_CLASS[density], className)}>{children}</div>;
}
