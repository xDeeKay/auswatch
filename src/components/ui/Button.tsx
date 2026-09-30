import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonTone = "primary" | "destructive" | "secondary";
export type ButtonSize = "xs" | "sm" | "md";

const TONE_CLASS: Record<ButtonTone, string> = {
  primary: "border-amber bg-amber/10 text-amber hover:bg-amber/20",
  destructive: "border-error bg-error/10 text-error hover:bg-error/20",
  secondary: "border-foreground/20 text-foreground/70 hover:border-amber hover:text-amber",
};

// All three sizes share the same height (h-control, matching the shared
// field controls in Field.tsx) and text size, so a button always lines up
// with an adjacent input; only the horizontal padding changes between them.
const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: "px-2 text-sm",
  sm: "px-3 text-sm",
  md: "px-4 text-sm",
};

const BASE_CLASS =
  "inline-flex h-control items-center justify-center rounded border font-label transition disabled:cursor-not-allowed disabled:opacity-40";

type CommonProps = {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = CommonProps & { href: string };
type ButtonAsButton = CommonProps & {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { tone = "primary", size = "md", className, children } = props;
  const classes = cn(BASE_CLASS, TONE_CLASS[tone], SIZE_CLASS[size], className);

  if (props.href !== undefined) {
    if (/^https?:\/\//.test(props.href)) {
      return (
        <a href={props.href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={props.type ?? "button"} disabled={props.disabled} className={classes}>
      {children}
    </button>
  );
}
