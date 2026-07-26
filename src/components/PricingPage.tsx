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
  { 
    key: 'free', 
    label: 'Free', 
    price: '₹0', 
    drafts: '10 lifetime drafts',
    features: ['10 lifetime drafts total', 'Standard generation speed'] 
  },
  { 
    key: 'basic', 
    label: 'Basic', 
    price: '₹149/month', 
    drafts: 'Unlimited drafts',
    features: ['Unlimited drafts', 'Draft History', 'PDF Downloads', 'Future features included'] 
  },
] as const;

export default function PricingPage() {
  const { session, profile, refreshAccount, isPro } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPlan, setCurrentPlan] = useState<string>('Free');
  const [dbPlan, setDbPlan] = useState<string>('free');

  const [discountData, setDiscountData] = useState({
    discountAvailable: false,
    remaining: 0,
    discountPrice: 99,
    originalPrice: 149,
  });

  useEffect(() => {
    fetch('/api/discount')
      .then(r => r.json())
      .then(data => setDiscountData(data))
      .catch(err => console.error('Failed to fetch discount', err));
  }, []);

  useEffect(() => {
    if (session?.user) {
      refreshAccount().catch(err => console.error('Failed to refresh account on pricing page mount', err));
    }
  }, [session?.user]); // Only run when user session is available

  // Calculate formatted plan for display
  useEffect(() => {
    const fetchFreshPlan = async () => {
      if (!session?.user?.id) return;
      try {
        const { data } = await createClient()
          .from('profiles')
          .select('plan, drafts_limit')
          .eq('user_id', session.user.id)
          .single();
        if (data) {
          const planStr = data.plan || 'free';
          setDbPlan(planStr);
          setCurrentPlan(planStr === 'free' ? 'Free' : planStr.charAt(0).toUpperCase() + planStr.slice(1));
        }
      } catch (err) {
        console.error('Failed to fetch fresh plan', err);
      }
    };
    fetchFreshPlan();
  }, [session?.user?.id]);

  const handleSubscribe = async (plan: 'basic') => {
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

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {PLANS.map((plan) => {
              const pPlan = dbPlan || 'free';
              const showBuyNow = pPlan === 'free';
              
              let badge = null;
              if (plan.key === 'free' && pPlan === 'free') {
                badge = <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Active</span>;
              } else if (plan.key === 'basic' && pPlan === 'basic') {
                badge = <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Current Plan</span>;
              }

              return (
                <div key={plan.key} className="rounded-3xl border border-gold/30 bg-[#07111f] p-6 shadow-[0_0_35px_rgba(212,175,55,0.08)] flex flex-col">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gold">{plan.label}</h2>
                    {badge}
                  </div>
                  <p className="mt-3 text-sm text-cream/70">{plan.drafts}</p>
                  {plan.key === 'basic' ? (
                    discountData.discountAvailable ? (
                      <div style={{ marginBottom: '8px', marginTop: '16px' }}>
                        <span style={{
                          textDecoration: 'line-through',
                          color: '#ff4444',
                          fontSize: '1.2rem',
                          marginRight: '8px',
                        }}>
                          ₹149
                        </span>
                        <span style={{
                          fontSize: '2.4rem',
                          fontWeight: 800,
                          color: '#c9a84c',
                        }}>
                          ₹99
                        </span>
                        <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>/mo</span>
                        <div style={{
                          background: '#ff4444',
                          color: 'white',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-block',
                          marginLeft: '8px',
                        }}>
                          34% OFF
                        </div>
                        <p style={{ 
                          color: '#c9a84c', fontSize: '0.78rem', 
                          marginTop: '6px', fontWeight: 600 
                        }}>
                          ⚡ Only {discountData.remaining} spots left at this price!
                        </p>
                      </div>
                    ) : (
                      <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#c9a84c', marginTop: '16px' }}>
                        ₹149<span style={{ fontSize: '0.9rem', opacity: 0.6 }}>/mo</span>
                      </div>
                    )
                  ) : (
                    <p className="mt-4 text-4xl font-semibold text-cream">{plan.price}</p>
                  )}
                  <ul className="mt-6 space-y-2 text-sm text-cream/70 flex-1">
                    {plan.features.map(f => <li key={f}>• {f}</li>)}
                  </ul>
                  {plan.key !== 'free' ? (
                    <div className="mt-8 flex flex-col gap-3 w-full">
                      {!showBuyNow && (
                        <div className="w-full rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-center text-emerald-300">
                          Current Plan
                        </div>
                      )}
                      <button
                        onClick={() => void handleSubscribe(plan.key as 'basic')}
                        disabled={loadingPlan === plan.key}
                        className="w-full rounded-full border border-gold/40 px-4 py-3 text-sm font-semibold transition bg-gold text-[#020b14] hover:bg-[#ffd966]"
                      >
                        {loadingPlan === plan.key ? 'Processing...' : 'Buy Now'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-8 w-full px-4 py-3 text-sm font-semibold text-center text-cream/50 h-[46px]">
                      {pPlan === 'free' ? 'Current Plan' : ''}
                    </div>
                  )}
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
                  if (!session?.user) {
                    console.error('User is null!')
                    alert('Not logged in!')
                    return
                  }
                  console.log('User ID:', session.user.id)
                  
                  const res = await fetch('/api/razorpay/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      razorpay_order_id: 'test_order_123',
                      razorpay_payment_id: 'test_payment_123',
                      razorpay_signature: 'test_skip',
                      plan: 'basic',
                      userId: session.user.id,
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
