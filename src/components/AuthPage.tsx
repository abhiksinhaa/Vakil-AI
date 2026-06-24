'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { applyReferralOnSignup, ensureUserRecords } from '../lib/userAccount';

const REFERRAL_STORAGE_KEY = 'draftee_ref';
import AuthAnimatedBackground from './auth/AuthAnimatedBackground';
import AuthLawyerWalk from './auth/AuthLawyerWalk';
import '../styles/authScene.css';

function friendlyAuthError(code, fallback) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return fallback || 'Authentication failed. Please try again.';
  }
}

async function applyPendingReferral() {
  const refCode = typeof window !== 'undefined' ? localStorage.getItem(REFERRAL_STORAGE_KEY) : null;
  if (refCode) {
    try {
      await applyReferralOnSignup(refCode);
    } finally {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
  }
}

export default function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<'advocate' | 'individual'>('advocate');

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim().toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
        await ensureUserRecords(userType);
        await applyPendingReferral();
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(friendlyAuthError(err?.code, err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserRecords(userType);
      // Newly created Google accounts get any pending referral applied.
      const isNewUser =
        result?.user?.metadata?.creationTime === result?.user?.metadata?.lastSignInTime;
      if (isNewUser) {
        await applyPendingReferral();
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(friendlyAuthError(err?.code, err?.message));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page relative min-h-screen flex flex-col items-center justify-center px-4 py-12 pb-36 sm:pb-40">
      <AuthAnimatedBackground />
      <AuthLawyerWalk />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <h1 className="font-display text-5xl sm:text-6xl font-semibold text-gold mb-2 drop-shadow-[0_0_24px_rgba(201,168,76,0.35)]">
            Draftee
          </h1>
          <p className="text-cream/60 text-sm">
            AI-powered legal drafts for Indian advocates
          </p>
        </div>

        <div className="card auth-form-glow bg-card/95 backdrop-blur-md border-gold/20">
          <h2 className="font-display text-xl text-cream mb-6">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>

          <div className="mb-6 space-y-3">
            <label className="text-sm font-medium text-cream/80">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('advocate')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  userType === 'advocate'
                    ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(201,168,76,0.2)]'
                    : 'bg-navy/40 border-border hover:border-gold/50'
                }`}
              >
                <span className="text-2xl mb-1">🧑‍⚖️</span>
                <span className={`text-sm font-medium ${userType === 'advocate' ? 'text-gold' : 'text-cream'}`}>
                  Advocate / Lawyer
                </span>
                {!isLogin && <span className="text-[10px] text-cream/50 mt-1">₹99/mo unlimited drafts</span>}
              </button>
              <button
                type="button"
                onClick={() => setUserType('individual')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  userType === 'individual'
                    ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(201,168,76,0.2)]'
                    : 'bg-navy/40 border-border hover:border-gold/50'
                }`}
              >
                <span className="text-2xl mb-1">👤</span>
                <span className={`text-sm font-medium ${userType === 'individual' ? 'text-gold' : 'text-cream'}`}>
                  Individual / General
                </span>
                {!isLogin && <span className="text-[10px] text-cream/50 mt-1">₹50 per draft</span>}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="btn-secondary w-full mb-5"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-cream/40">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adv. Rajesh Kumar"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="advocate@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading || googleLoading}>
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  {isLogin ? 'Signing in…' : 'Creating account…'}
                </>
              ) : isLogin ? (
                userType === 'advocate' ? 'Sign in as Advocate' : 'Sign in as Individual'
              ) : (
                userType === 'advocate' ? 'Sign up as Advocate' : 'Sign up as Individual'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-cream/50 mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                router.push(isLogin ? '/signup' : '/login');
              }}
              className="text-gold hover:underline font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-cream/30 mt-8">
          Professional legal drafting · BNS · BNSS · BSA · Indian statutes
        </p>
      </div>
    </div>
  );
}
