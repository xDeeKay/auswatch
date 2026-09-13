import type { SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const CONTROL_CLASS =
  "w-full rounded border border-parchment/20 bg-transparent px-2 py-1.5 text-sm text-parchment focus:border-amber focus:outline-none";
const PLACEHOLDER_CLASS = "placeholder:text-parchment/30";

export function Label({ children }: { children: ReactNode }) {
  return <label className="font-mono text-xs tracking-[0.05em] text-amber">{children}</label>;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CONTROL_CLASS, className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL_CLASS, PLACEHOLDER_CLASS, className)} />;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL_CLASS, PLACEHOLDER_CLASS, className)} />;
}
