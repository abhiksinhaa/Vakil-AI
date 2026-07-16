'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { startCheckout } from '../lib/razorpay';
import { createClient } from '../lib/supabase';

console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
  { key: 'basic', label: 'Basic', price: '₹149', drafts: '30 drafts' },
  { key: 'standard', label: 'Standard', price: '₹199', drafts: '40 drafts' },
  { key: 'pro', label: 'Pro', price: '₹299', drafts: '100 drafts' },
] as const;

export default function PricingPage() {
  const { session, profile, refreshAccount } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('Free');

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        if (profile) {
          const plan = profile.plan || 'free';
          setCurrentPlan(plan === 'free' ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1));
        }
      }
    }
    loadUser()
  }, [])

  const handleSubscribe = async (plan: 'basic' | 'standard' | 'pro') => {
    if (!session?.user?.id) {
      setError('Please sign in to purchase.');
      return;
    }

    setLoadingPlan(plan);
    setError(null);
    setMessage(null);

    try {
      await startCheckout({
        plan,
        userId: session.user.id,
        userEmail: session.user.email,
        userName: profile?.full_name || session.user.email,
        onSuccess: async () => {
          await refreshAccount();
          window.location.href = '/dashboard?payment=success';
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
                    <li>• Valid for 30 days</li>
                    <li>• Secure one-time payment</li>
                    <li>• Instant limit updates</li>
                    <li>• Priority draft generation</li>
                  </ul>
                  <button
                    onClick={() => void handleSubscribe(plan.key as 'basic' | 'standard' | 'pro')}
                    disabled={loadingPlan === plan.key}
                    className="mt-8 w-full rounded-full border border-gold/40 bg-gold px-4 py-3 text-sm font-semibold text-[#020b14] transition hover:bg-[#ffd966]"
                  >
                    {loadingPlan === plan.key ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-gold/40 px-6 py-3 text-sm font-medium text-gold hover:bg-gold hover:text-[#020b14] transition-all">
              Return to Dashboard
            </Link>
            
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={async () => {
                  if (!user) {
                    console.error('User is null!')
                    alert('Not logged in!')
                    return
                  }
                  console.log('User ID:', user.id)
                  
                  const res = await fetch('/api/razorpay/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      razorpay_order_id: 'test_order_123',
                      razorpay_payment_id: 'test_payment_123',
                      razorpay_signature: 'test_skip',
                      plan: 'basic',
                      userId: user.id,
                    }),
                  })
                  const result = await res.json()
                  console.log('Test verify result:', result)
                  if (result.success) {
                    window.location.href = '/dashboard?payment=success'
                  }
                }}
                style={{
                  background: 'red', color: 'white',
                  padding: '10px 20px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                [DEV] Test Plan Update
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
