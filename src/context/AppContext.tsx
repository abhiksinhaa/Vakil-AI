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
  updateTheme,
} from '../lib/userAccount';
import type { Profile, Session, Subscription } from '../lib/types';

const THEME_KEY = 'draftee-theme';

interface AppContextValue {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  theme: string;
  toggleTheme: () => Promise<void>;
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
  const [theme, setTheme] = useState<string>('dark');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const session = useMemo(() => toSession(user), [user]);

  const applyTheme = useCallback((next: string) => {
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.add('theme-transition');
    }
  }, []);

  // Restore persisted theme on mount (client only).
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    if (stored) applyTheme(stored);
    else document.documentElement.setAttribute('data-theme', 'dark');
  }, [applyTheme]);

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
    } catch (err) {
      console.error('Account load error:', err);
    } finally {
      setAccountLoading(false);
    }
  }, [theme, applyTheme]);

  useEffect(() => {
    if (!authLoading) refreshAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (auth.currentUser) {
      try {
        await updateTheme(next as 'dark' | 'light');
        setProfile((prev) => (prev ? { ...prev, theme: next as 'dark' | 'light' } : prev));
      } catch (err) {
        console.error('Theme save error:', err);
      }
    }
  }, [theme, applyTheme]);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      user,
      authLoading,
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
    [session, user, authLoading, theme, toggleTheme, profile, subscription, accountLoading, refreshAccount]
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
