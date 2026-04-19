'use client';
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';

/**
 * Reads the caller's preferred theme from localStorage, falling back
 * to the OS `prefers-color-scheme` media query. Runs client-side only;
 * SSR returns `light` as a stable default (the FOUC-prevention script
 * in app/layout.tsx applies the correct class before hydration, so the
 * HTML arrives with the right theme even though the React tree
 * initialises with `light`).
 */
function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage may be blocked in private mode / embedded contexts */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  // Sync the <html> class + localStorage whenever `theme` changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add(DARK_CLASS);
    else root.classList.remove(DARK_CLASS);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* same tolerance as above */
    }
  }, [theme]);

  // Keep in sync with the OS-level preference when the user hasn't
  // made an explicit choice since last mount. Matches the browser
  // "follow system" contract users expect.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      try {
        if (!window.localStorage.getItem(STORAGE_KEY)) {
          setThemeState(e.matches ? 'dark' : 'light');
        }
      } catch {
        /* ignore */
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );

  return { theme, isDark: theme === 'dark', setTheme, toggle };
}
