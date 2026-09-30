"use client";

import { useEffect, useState } from "react";
import { CloseButton } from "@/components/ui/CloseButton";

export function NavDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="desktop:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center text-foreground/70 transition hover:text-amber"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close menu"
          inert={!open}
          className={`absolute inset-0 bg-surface/80 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          inert={!open}
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-l border-foreground/10 bg-surface px-6 py-6 transition-transform duration-200 watch:w-full watch:max-w-full watch:border-l-0 watch:px-watch-inset watch:py-watch-inset ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm text-foreground/50">Menu</h2>
            <CloseButton onClick={() => setOpen(false)} label="Close menu" />
          </div>
          <div
            className="mt-6 flex flex-col divide-y divide-foreground/10 overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
