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
    drafts: '5 lifetime drafts',
    features: ['5 lifetime drafts total', 'Standard generation speed'] 
  },
  { 
    key: 'basic', 
    label: 'Basic', 
    monthlyPrice: '₹149/mo',
    discountedPrice: '₹99/mo',
    discountPercent: '34% OFF',
    limitedOffer: 'For First 100 Paying Users',
    annualPrice: '₹1,499/yr', 
    drafts: '90 drafts/month',
    features: ['90 drafts/month', 'Draft History', 'PDF Downloads', 'Future features included'] 
  },
  { 
    key: 'pro', 
    label: 'Pro', 
    monthlyPrice: '₹399/mo',
    annualPrice: '₹3,999/yr', 
    drafts: '175 drafts/month',
    features: ['175 drafts/month', 'Draft History', 'PDF Downloads', 'Priority generation speed'],
    isPopular: true
  },
  {
    key: 'firm',
    label: 'Firm',
    monthlyPrice: '₹999/mo',
    annualPrice: '₹9,999/yr',
    drafts: '500 shared drafts/month',
    features: ['500 pooled drafts/month', '3 Member Seats included', 'Admin Dashboard', 'Priority generation speed']
  }
] as const;

export default function PricingPage() {
  const { session, profile, refreshAccount, isPro } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPlan, setCurrentPlan] = useState<string>('Free');
  const [dbPlan, setDbPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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

  const handleSubscribe = async (plan: 'basic' | 'pro' | 'firm') => {
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
        billingCycle,
        userId: session.user.id,
        userEmail: session.user.email,
        userName: profile?.full_name || session.user.email,
        onSuccess: async (response: any) => {
          await refreshAccount();
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          await refreshAccount();
          window.location.href = '/dashboard?payment=success&pid=' + (response?.razorpay_payment_id || '');
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

          <div className="flex justify-center mb-8">
            <div className="bg-[#07111f] p-1 rounded-full border border-gold/30 inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-gold text-[#020b14]' : 'text-cream/70 hover:text-cream'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'annual' ? 'bg-gold text-[#020b14]' : 'text-cream/70 hover:text-cream'}`}
              >
                Annual
              </button>
            </div>
          </div>

          {message ? <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div> : null}
          {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

          <div className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto">
            {PLANS.map((plan) => {
              const pPlan = dbPlan || 'free';
              const isActivePlan = pPlan === plan.key;
              
              let badge = null;
              if (isActivePlan) {
                badge = <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Current Plan</span>;
              } else if ('isPopular' in plan && plan.isPopular) {
                badge = <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">Most Popular</span>;
              } else if (plan.key !== 'free' && billingCycle === 'annual') {
                badge = <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Save ~2 months</span>;
              }

              return (
                <div key={plan.key} className="rounded-3xl border border-gold/30 bg-[#07111f] p-6 shadow-[0_0_35px_rgba(212,175,55,0.08)] flex flex-col relative overflow-hidden">
                  {isActivePlan && <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-3xl pointer-events-none" />}
                  
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gold">{plan.label}</h2>
                    {badge}
                  </div>
                  <p className="mt-3 text-sm text-cream/70">{plan.drafts}</p>
                  
                  {plan.key === 'free' ? (
                    <p className="mt-4 text-4xl font-semibold text-cream">{'price' in plan ? plan.price : '₹0'}</p>
                  ) : plan.key === 'basic' && 'discountedPrice' in plan ? (
                    // Basic plan with discount
                    <div className="mt-6">
                      {/* Original price with strikethrough and discount badge */}
                      <div className="flex items-center gap-3 mb-2">
                        <span style={{ fontSize: '1.1rem', textDecoration: 'line-through', opacity: 0.6, color: '#c9a84c' }}>
                          {'monthlyPrice' in plan ? plan.monthlyPrice : ''}
                        </span>
                        <span className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                          {plan.discountPercent || ''}
                        </span>
                      </div>
                      {/* Discounted price - main */}
                      <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#c9a84c', marginBottom: '8px' }}>
                        {plan.discountedPrice}<span style={{ fontSize: '0.9rem', opacity: 0.6 }}>/mo</span>
                      </div>
                      {/* Limited offer text */}
                      <p style={{ fontSize: '0.85rem', opacity: 0.65, color: '#e8e0d0', fontStyle: 'italic' }}>
                        {plan.limitedOffer || ''}
                      </p>
                    </div>
                  ) : (
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#c9a84c', marginTop: '16px' }}>
                      {('monthlyPrice' in plan ? (billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice) : '').split('/')[0]}<span style={{ fontSize: '0.9rem', opacity: 0.6 }}>/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                    </div>
                  )}

                  <ul className="mt-6 space-y-2 text-sm text-cream/70 flex-1">
                    {plan.features.map(f => <li key={f}>• {f}</li>)}
                  </ul>
                  
                  {plan.key !== 'free' ? (
                    <div className="mt-8 flex flex-col gap-3 w-full">
                      {isActivePlan && (
                        <div className="w-full rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-center text-emerald-300">
                          Current Plan
                        </div>
                      )}
                      {!isActivePlan && (
                        <button
                          onClick={() => void handleSubscribe(plan.key as 'basic' | 'pro')}
                          disabled={loadingPlan === plan.key}
                          className="w-full rounded-full border border-gold/40 px-4 py-3 text-sm font-semibold transition bg-gold text-[#020b14] hover:bg-[#ffd966]"
                        >
                          {loadingPlan === plan.key ? 'Processing...' : 'Buy Now'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-8 w-full px-4 py-3 text-sm font-semibold text-center text-cream/50 h-[46px]">
                      {isActivePlan ? 'Current Plan' : ''}
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
