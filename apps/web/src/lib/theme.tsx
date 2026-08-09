"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type GuardianTheme = "light" | "dark";

type ThemeValue = {
  theme: GuardianTheme;
  setTheme: (theme: GuardianTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);
const storageKey = "guardian-lens-theme";

function getClientTheme(): GuardianTheme {
  const saved = localStorage.getItem(storageKey);
  if (saved === "dark" || saved === "light") return saved;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("guardian-theme-change", callback);
  return () => window.removeEventListener("guardian-theme-change", callback);
}

function getServerTheme(): GuardianTheme {
  return "light";
}

export function GuardianThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<GuardianTheme>(subscribeToTheme, getClientTheme, getServerTheme);

  const setTheme = useCallback((nextTheme: GuardianTheme) => {
    localStorage.setItem(storageKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event("guardian-theme-change"));
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "light" ? "dark" : "light"), [setTheme, theme]);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useGuardianTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useGuardianTheme must be used inside GuardianThemeProvider");
  return value;
}
