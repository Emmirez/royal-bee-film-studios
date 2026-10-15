import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'rb-admin-theme';

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

function read() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

/**
 * Light/dark theme for the staff workspace. The public website is always the
 * light off-white brand theme (with its own dark cinematic sections).
 * The preference is also saved to the user's profile by the admin layout.
 */
export function ThemeProvider({ children, scopeRef }) {
  const [preference, setPreference] = useState(read);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const el = scopeRef?.current || document.documentElement;
    el.setAttribute('data-theme', resolved);
    return () => el.removeAttribute('data-theme');
  }, [resolved, scopeRef]);

  const setTheme = useCallback((value) => {
    setPreference(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setTheme }), [preference, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
