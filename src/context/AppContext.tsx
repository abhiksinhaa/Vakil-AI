'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  ensureUserRecords,
  fetchProfile,
  fetchSubscription,
  isProActive,
  updateProfile,
} from '../lib/userAccount';
import type { Profile, Session, Subscription } from '../lib/types';

const THEME_KEY = 'draftee-theme';
const FONT_SIZE_KEY = 'draftee-font-size';

interface AppContextValue {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  theme: 'dark' | 'light' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  toggleTheme: () => Promise<void>;
  setThemeMode: (theme: 'dark' | 'light' | 'system') => Promise<void>;
  setFontSizeMode: (size: 'small' | 'medium' | 'large') => Promise<void>;
  profile: Profile | null;
  subscription: Subscription | null;
  isPro: boolean;
  accountLoading: boolean;
  refreshAccount: () => Promise<void>;
  setProfile: Dispatch<SetStateAction<Profile | null>>;
  setSubscription: Dispatch<SetStateAction<Subscription | null>>;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Build the session shape the UI components expect from the Firebase user. */
function toSession(user: User | null): Session | null {
  if (!user) return null;
  return {
    user: {
      id: user.uid,
      email: user.email,
      user_metadata: { full_name: user.displayName },
    },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const session = useMemo(() => toSession(user), [user]);

  const applyTheme = useCallback((next: 'dark' | 'light' | 'system') => {
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, next);
      const actualTheme = next === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : next;
      document.documentElement.setAttribute('data-theme', actualTheme);
      document.documentElement.classList.add('theme-transition');
    }
  }, []);

  const applyFontSize = useCallback((size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FONT_SIZE_KEY, size);
      document.documentElement.style.fontSize =
        size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
    }
  }, []);

  // Restore persisted theme and font size on mount (client only).
  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    const storedFontSize = typeof window !== 'undefined' ? localStorage.getItem(FONT_SIZE_KEY) : null;
    if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
      applyTheme(storedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    if (storedFontSize === 'small' || storedFontSize === 'medium' || storedFontSize === 'large') {
      applyFontSize(storedFontSize);
    } else {
      applyFontSize('medium');
    }
  }, [applyTheme, applyFontSize]);

  // Subscribe to Firebase auth state.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!auth.currentUser) {
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
      if (p?.font_size && p.font_size !== fontSize) {
        applyFontSize(p.font_size);
      }
    } catch (err) {
      console.error('Account load error:', err);
    } finally {
      setAccountLoading(false);
    }
  }, [theme, fontSize, applyTheme, applyFontSize]);

  useEffect(() => {
    if (!authLoading) refreshAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (auth.currentUser) {
      try {
        await updateProfile({ theme: next });
        setProfile((prev) => (prev ? { ...prev, theme: next } : prev));
      } catch (err) {
        console.error('Theme save error:', err);
      }
    }
  }, [theme, applyTheme]);

  const setThemeMode = useCallback(async (next: 'dark' | 'light' | 'system') => {
    applyTheme(next);
    if (auth.currentUser) {
      try {
        await updateProfile({ theme: next });
        setProfile((prev) => (prev ? { ...prev, theme: next } : prev));
      } catch (err) {
        console.error('Theme save error:', err);
      }
    }
  }, [applyTheme]);

  const setFontSizeMode = useCallback(async (size: 'small' | 'medium' | 'large') => {
    applyFontSize(size);
    if (auth.currentUser) {
      try {
        await updateProfile({ font_size: size });
        setProfile((prev) => (prev ? { ...prev, font_size: size } : prev));
      } catch (err) {
        console.error('Font size save error:', err);
      }
    }
  }, [applyFontSize]);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      user,
      authLoading,
      theme,
      fontSize,
      toggleTheme,
      setThemeMode,
      setFontSizeMode,
      profile,
      subscription,
      isPro: isProActive(subscription),
      accountLoading,
      refreshAccount,
      setProfile,
      setSubscription,
    }),
    [session, user, authLoading, theme, fontSize, toggleTheme, setThemeMode, setFontSizeMode, profile, subscription, accountLoading, refreshAccount]
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
