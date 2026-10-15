import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the user chose. `system` follows the OS and keeps following it. */
  preference: ThemePreference;
  /** What is actually on screen — `system` resolved against the OS setting. */
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Flips to the opposite of what is currently showing. */
  toggleTheme: () => void;
}

const STORAGE_KEY = 'nexus:theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches !== false;
}

/**
 * Read the stored preference.
 *
 * Wrapped because `localStorage` throws outright in a Safari private window and
 * wherever site data is blocked — and a theme preference is not worth taking
 * the app down for.
 */
function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* no storage available; fall through to the default */
  }
  return 'system';
}

/**
 * Light and dark are both first-class here, and dark stays the default: it is
 * what the brand is built around, and it is what an unconfigured visitor with
 * no OS preference gets.
 *
 * The resolved theme is written to `data-theme` on <html>, which is the single
 * switch every token in index.css hangs off. The inline script in index.html
 * writes the same attribute before first paint, so this effect confirms what is
 * already on screen rather than causing a flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => (prefersDark() ? 'dark' : 'light'));

  const theme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  // Keep following the OS while the preference is `system`. Someone whose
  // machine switches to dark at sunset should see the app follow.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    // Keeps the mobile browser chrome in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0D1B' : '#F6F7FA');
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preference applies for this session only */
    }
  }, []);

  // Toggling picks the opposite of what is on screen and makes it explicit,
  // which is what someone reaching for the control is asking for.
  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggleTheme }),
    [preference, theme, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
