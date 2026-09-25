export type ThemePreference = "auto" | "light" | "dark";

export const THEME_STORAGE_KEY = "auswatch-theme";
export const THEME_ORDER: readonly ThemePreference[] = ["auto", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "auto" || value === "light" || value === "dark";
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}

// "auto" is represented by the absence of data-theme so the stylesheet's
// prefers-color-scheme rule applies without any script running.
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

// Runs inline in <head> before first paint to avoid a flash of the wrong theme.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
