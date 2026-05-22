import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ensureUserRecords,
  fetchProfile,
  fetchSubscription,
  isProActive,
  updateTheme,
} from '../lib/userAccount';

const THEME_KEY = 'draftee-theme';

const AppContext = createContext(null);

export function AppProvider({ children, session }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const applyTheme = useCallback((next) => {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.add('theme-transition');
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setSubscription(null);
      return;
    }
    setAccountLoading(true);
    try {
      await ensureUserRecords();
      const [p, s] = await Promise.all([fetchProfile(), fetchSubscription()]);
      setProfile(p);
      setSubscription(s);
      if (p?.theme && p.theme !== theme) {
        applyTheme(p.theme);
      }
    } catch (err) {
      console.error('Account load error:', err);
    } finally {
      setAccountLoading(false);
    }
  }, [session, theme, applyTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (session) {
      try {
        await updateTheme(next);
        setProfile((prev) => (prev ? { ...prev, theme: next } : prev));
      } catch (err) {
        console.error('Theme save error:', err);
      }
    }
  }, [theme, applyTheme, session]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      profile,
      subscription,
      isPro: isProActive(subscription),
      accountLoading,
      refreshAccount,
      setProfile,
      setSubscription,
    }),
    [theme, toggleTheme, profile, subscription, accountLoading, refreshAccount]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
