import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "poker_theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return "system";
  });

  const resolved = resolveTheme(preference);

  // Apply class + persist whenever preference changes
  useEffect(() => {
    applyTheme(resolveTheme(preference));
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  // Listen for OS-level theme changes when preference is "system"
  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme());
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => setPreferenceState(next), []);

  const cycleTheme = useCallback(
    () =>
      setPreferenceState((prev) => {
        const order: ThemePreference[] = ["system", "light", "dark"];
        return order[(order.indexOf(prev) + 1) % order.length];
      }),
    [],
  );

  return { theme: resolved, preference, setTheme, cycleTheme };
}
