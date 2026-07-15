'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { startSubscriptionCheckout } from '../lib/razorpay';

const GLITTER_STYLES = `
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .glitter-text {
    background: linear-gradient(to right, #d4af37, #fff, #d4af37);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: gradient-shift 3s linear infinite;
  }
  .sparkle-container {
    position: relative;
    display: inline-block;
  }
  .sparkle-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #d4af37;
    box-shadow: 0 0 10px 2px rgba(212, 175, 55, 0.6);
    animation: sparkle 2s ease-in-out infinite;
  }
`;

const PLANS = [
  { key: 'basic', label: 'Basic', price: '₹149/mo', drafts: '30 drafts/month' },
  { key: 'standard', label: 'Standard', price: '₹199/mo', drafts: '40 drafts/month' },
  { key: 'pro', label: 'Pro', price: '₹299/mo', drafts: '100 drafts/month' },
] as const;

export default function PricingPage() {
  const router = useRouter();
  const { session, profile, refreshAccount } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = useMemo(() => {
    const plan = profile?.plan || 'free';
    return plan === 'free' ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1);
  }, [profile?.plan]);

  useEffect(() => {
    if (!profile?.plan) {
      void refreshAccount();
    }
  }, [profile?.plan, refreshAccount]);

  const handleSubscribe = async (plan: 'basic' | 'standard' | 'pro') => {
    if (!session?.user?.email) {
      setError('Please sign in to subscribe.');
      return;
    }

    setLoadingPlan(plan);
    setError(null);
    setMessage(null);

    try {
      console.log('PricingPage: Razorpay Key present?', !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
      console.log('PricingPage: initiating subscription for plan', plan);
      await startSubscriptionCheckout({
        plan,
        userEmail: session.user.email,
        userName: profile?.full_name || session.user.email,
        onSuccess: async () => {
          await refreshAccount();
          router.push('/dashboard?payment=success');
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to start checkout.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020b14] flex flex-col relative overflow-hidden">
      <style>{GLITTER_STYLES}</style>
      <Navbar />

      <div className="flex-1 w-full px-4 py-10 flex flex-col items-center justify-center relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#d4af37]/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-6xl relative z-20">
          <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-[#1e2a3a] px-4 py-4 text-sm text-[#d1d5db] text-center">
            🚧 Premium launching very soon!
          </div>
          <div className="text-center mb-8">
            <div className="sparkle-container mb-6">
              <span className="sparkle-dot" style={{ top: '-10px', left: '-20px', animationDelay: '0s' }}></span>
              <span className="sparkle-dot" style={{ top: '20px', right: '-30px', animationDelay: '0.7s' }}></span>
              <span className="sparkle-dot" style={{ bottom: '-15px', left: '40%', animationDelay: '1.2s' }}></span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight px-6 py-4">
                <span className="mx-4 glitter-text">Choose Your Premium Plan</span>
              </h1>
            </div>
            <p className="text-cream/90 text-lg max-w-3xl mx-auto font-light leading-relaxed">
              Unlock higher monthly draft limits with secure Razorpay checkout.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4 text-sm text-cream/90 text-center">
            Current plan: <span className="font-semibold text-gold">{currentPlan}</span>
            {profile?.plan_expires_at ? ` • Renews ${new Date(profile.plan_expires_at).toLocaleDateString('en-IN')}` : ''}
          </div>

          {message ? <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div> : null}
          {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isActive = profile?.plan === plan.key;
              return (
                <div key={plan.key} className="rounded-3xl border border-gold/30 bg-[#07111f] p-6 shadow-[0_0_35px_rgba(212,175,55,0.08)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gold">{plan.label}</h2>
                    {isActive ? <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Active</span> : null}
                  </div>
                  <p className="mt-3 text-sm text-cream/70">{plan.drafts}</p>
                  <p className="mt-4 text-4xl font-semibold text-cream">{plan.price}</p>
                  <ul className="mt-6 space-y-2 text-sm text-cream/70">
                    <li>• Secure Razorpay payment</li>
                    <li>• Monthly renewals</li>
                    <li>• Priority draft generation</li>
                  </ul>
                  <button
                    onClick={() => void handleSubscribe(plan.key as 'basic' | 'standard' | 'pro')}
                    disabled
                    className="mt-8 w-full rounded-full border border-transparent bg-[#1e2a3a] px-4 py-3 text-sm font-semibold text-[#6b7280] cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-gold/40 px-6 py-3 text-sm font-medium text-gold hover:bg-gold hover:text-[#020b14] transition-all">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
