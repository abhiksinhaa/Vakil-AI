import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AuthAnimatedBackground from './auth/AuthAnimatedBackground';
import AuthLawyerWalk from './auth/AuthLawyerWalk';
import '../styles/authScene.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (authError) throw authError;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page relative min-h-screen flex flex-col items-center justify-center px-4 py-12 pb-28">
      <AuthAnimatedBackground />
      <AuthLawyerWalk />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-semibold text-gold mb-2 drop-shadow-[0_0_24px_rgba(201,168,76,0.35)]">
            Draft<span className="text-cream">ee</span>
          </h1>
          <p className="text-cream/60 text-sm">
            AI-powered legal drafts for Indian advocates
          </p>
        </div>

        <div className="card auth-form-glow bg-card/95 backdrop-blur-md border-gold/20">
          <h2 className="font-display text-xl text-cream mb-6">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>

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

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  {isLogin ? 'Signing in…' : 'Creating account…'}
                </>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-cream/50 mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
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
