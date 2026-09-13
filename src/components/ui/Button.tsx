import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonTone = "primary" | "destructive" | "secondary";
export type ButtonSize = "xs" | "sm" | "md";

const TONE_CLASS: Record<ButtonTone, string> = {
  primary: "border-amber bg-amber/10 text-amber hover:bg-amber/20",
  destructive: "border-error bg-error/10 text-error hover:bg-error/20",
  secondary: "border-parchment/20 text-parchment/70 hover:border-amber hover:text-amber",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

const BASE_CLASS = "inline-block rounded border font-mono transition disabled:cursor-not-allowed disabled:opacity-40";

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
