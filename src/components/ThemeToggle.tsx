"use client";

import { useEffect, useState } from "react";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  isThemePreference,
  nextThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const LABELS: Record<ThemePreference, string> = {
  auto: "Theme: auto (follows your device). Switch to light",
  light: "Theme: light. Switch to dark",
  dark: "Theme: dark. Switch to auto",
};

function Icon({ preference }: { preference: ThemePreference }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, className: "h-5 w-5" };
  if (preference === "light") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </svg>
    );
  }
  if (preference === "dark") {
    return (
      <svg {...common} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 010 16z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("auto");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemePreference(stored)) setPreference(stored);
    } catch {
      // Storage can be unavailable (private mode, blocked site data); fall back to auto.
    }
    setMounted(true);
  }, []);

  const cycle = () => {
    const next = nextThemePreference(preference);
    setPreference(next);
    applyThemePreference(next);
    try {
      if (next === "auto") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this page view.
    }
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={LABELS[preference]}
      title={LABELS[preference]}
      className="flex h-9 w-9 items-center justify-center text-foreground/70 transition hover:text-amber"
    >
      {mounted ? <Icon preference={preference} /> : <span className="h-5 w-5" />}
    </button>
  );
}
