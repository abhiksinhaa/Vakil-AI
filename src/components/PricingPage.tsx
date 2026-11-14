'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { startCheckout } from '../lib/razorpay';
import { createClient } from '../lib/supabase';
import { getExistingPlanDraftLimit, getFreeTrialStatus, normalizePlan, PLAN_CONFIG } from '../lib/plans';
import { checkDraftAllowance } from '../lib/userAccount';

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
    label: PLAN_CONFIG.free.label,
    drafts: `${PLAN_CONFIG.free.draftsLimit} lifetime drafts`,
    features: PLAN_CONFIG.free.features,
  },
  {
    key: 'basic',
    label: PLAN_CONFIG.basic.label,
    monthlyAmount: PLAN_CONFIG.basic.monthlyAmount,
    annualAmount: PLAN_CONFIG.basic.annualAmount,
    drafts: `${PLAN_CONFIG.basic.draftsLimit} drafts/month`,
    features: PLAN_CONFIG.basic.features,
  },
  {
    key: 'pro',
    label: PLAN_CONFIG.pro.label,
    monthlyAmount: PLAN_CONFIG.pro.monthlyAmount,
    annualAmount: PLAN_CONFIG.pro.annualAmount,
    drafts: `${PLAN_CONFIG.pro.draftsLimit} drafts/month`,
    features: PLAN_CONFIG.pro.features,
    isPopular: true,
  },
  {
    key: 'firm',
    label: PLAN_CONFIG.firm.label,
    monthlyAmount: PLAN_CONFIG.firm.monthlyAmount,
    annualAmount: PLAN_CONFIG.firm.annualAmount,
    drafts: `${PLAN_CONFIG.firm.draftsLimit} pooled drafts/month`,
    features: PLAN_CONFIG.firm.features,
  },
] as const;

function formatRupees(amountPaise: number) {
  return `₹${(amountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function annualSavingsPercent(monthlyAmount: number, annualAmount: number) {
  return Math.round(((monthlyAmount * 12 - annualAmount) / (monthlyAmount * 12)) * 100);
}

interface PricingPageProps {
  paywall?: boolean;
  notice?: string | null;
  onClose?: () => void;
}

export default function PricingPage({ paywall = false, notice, onClose }: PricingPageProps) {
  const { session, profile, refreshAccount } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeAllowance, setFreeAllowance] = useState<Awaited<ReturnType<typeof checkDraftAllowance>> | null>(null);

  const [currentPlan, setCurrentPlan] = useState<string>('Free');
  const [dbPlan, setDbPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    if (session?.user) {
      refreshAccount().catch(err => console.error('Failed to refresh account on pricing page mount', err));
    }
  }, [session?.user]); // Only run when user session is available

  useEffect(() => {
    if (!session?.user?.id) return;
    checkDraftAllowance()
      .then(setFreeAllowance)
      .catch((err) => console.error('Failed to load pricing allowance:', err));
  }, [session?.user?.id]);

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
          const normalizedPlan = normalizePlan(planStr);
          setDbPlan(normalizedPlan);
          setCurrentPlan(PLAN_CONFIG[normalizedPlan].label);
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

  const trial = profile?.plan === 'free' ? getFreeTrialStatus(profile.created_at) : null;
  const trialActive = Boolean(trial?.active);
  const freeEnded = Boolean(trial && !trial.active) ||
    (profile?.plan === 'free' && freeAllowance?.remaining === 0);
  const displayedCurrentPlan = dbPlan === 'free'
    ? trialActive
      ? '7-Day Free Trial'
      : freeEnded
        ? 'Free ended'
        : 'Free'
    : currentPlan;

  return (
    <div
      className={paywall
        ? 'fixed inset-0 z-[100] overflow-y-auto bg-[#020b14]/95 px-2 py-4 sm:px-6'
        : 'min-h-screen bg-[#020b14] flex flex-col relative overflow-hidden'}
      onClick={paywall ? (event) => {
        if (event.target === event.currentTarget) onClose?.();
      } : undefined}
      role={paywall ? 'dialog' : undefined}
      aria-modal={paywall ? true : undefined}
      aria-label={paywall ? 'Unlock Premium to draft more' : undefined}
    >
      <style>{GLITTER_STYLES}</style>
      {!paywall && <Navbar />}
      {paywall && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pricing"
          className="fixed right-4 top-4 z-[110] rounded-full border border-gold/40 bg-[#07111f] px-3 py-2 text-sm text-cream hover:text-gold"
        >
          Close
        </button>
      )}

      <div className={`${paywall ? 'mx-auto w-full max-w-7xl px-2 py-10 sm:px-4' : 'flex-1 w-full px-4 py-10'} flex flex-col items-center justify-center relative z-10`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#d4af37]/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-6xl relative z-20">
          <div className="text-center mb-8">
            <div className="sparkle-container mb-6">
              <span className="sparkle-dot" style={{ top: '-10px', left: '-20px', animationDelay: '0s' }}></span>
              <span className="sparkle-dot" style={{ top: '20px', right: '-30px', animationDelay: '0.7s' }}></span>
              <span className="sparkle-dot" style={{ bottom: '-15px', left: '40%', animationDelay: '1.2s' }}></span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight px-6 py-4">
                <span className="mx-4 glitter-text">
                  {paywall ? 'Unlock Premium to draft more' : 'Choose Your Premium Plan'}
                </span>
              </h1>
            </div>
            <p className="text-cream/90 text-lg max-w-3xl mx-auto font-light leading-relaxed">
              {paywall
                ? notice || 'Upgrade your plan to continue drafting.'
                : 'Unlock higher monthly draft limits with secure Razorpay checkout.'}
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4 text-sm text-cream/90 text-center">
            Current plan: <span className="font-semibold text-gold">{displayedCurrentPlan}</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 mb-8">
            <div className="bg-[#07111f] p-1 rounded-full border border-gold/30 inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                aria-pressed={billingCycle === 'monthly'}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-gold text-[#020b14]' : 'text-cream/70 hover:text-cream'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                aria-pressed={billingCycle === 'annual'}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'annual' ? 'bg-gold text-[#020b14]' : 'text-cream/70 hover:text-cream'}`}
              >
                Annual
              </button>
            </div>
            {billingCycle === 'annual' && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Best Value
              </span>
            )}
          </div>

          {message ? <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div> : null}
          {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 max-w-6xl mx-auto">
            {PLANS.map((plan) => {
              const pPlan = dbPlan || 'free';
              const isActivePlan = pPlan === plan.key;
              const freeRemaining = freeAllowance?.remaining;
              const freeLabel = trialActive
                ? '7-Day Free Trial'
                : trial
                  ? 'Free Trial Ended'
                  : freeEnded
                    ? 'Free (Ended)'
                    : 'Free';
              const existingFreeLimit = getExistingPlanDraftLimit('free');
              const storedPaidLimit = plan.key === 'firm'
                ? profile?.organizations?.drafts_limit ?? profile?.drafts_limit
                : profile?.drafts_limit;
              const currentPaidLimit = isActivePlan && plan.key !== 'free' && typeof storedPaidLimit === 'number'
                ? storedPaidLimit
                : null;
              const draftDescription = plan.key === 'free'
                ? trialActive
                  ? `${trial?.daysLeft} ${trial?.daysLeft === 1 ? 'day' : 'days'} left, ${freeRemaining ?? PLAN_CONFIG.free.draftsLimit} drafts left today`
                  : freeEnded
                    ? 'Free access ended. Choose Basic or Pro to continue.'
                    : `${freeRemaining ?? existingFreeLimit ?? PLAN_CONFIG.free.existingDraftsLimit} free drafts remaining`
                : currentPaidLimit !== null
                  ? `${currentPaidLimit}${plan.key === 'firm' ? ' pooled' : ''} drafts/month`
                  : plan.drafts;
              const features = plan.key === 'free'
                ? trialActive
                  ? [`${trial?.daysLeft} days remaining`, `${freeRemaining ?? PLAN_CONFIG.free.draftsLimit} drafts left today`, ...PLAN_CONFIG.free.features.slice(2)]
                  : freeEnded
                    ? ['Free allowance ended', 'Upgrade to Basic or Pro to draft more']
                    : [`${freeRemaining ?? existingFreeLimit ?? PLAN_CONFIG.free.existingDraftsLimit} lifetime drafts remaining`, 'Standard generation speed']
                : currentPaidLimit !== null
                  ? [`${currentPaidLimit}${plan.key === 'firm' ? ' pooled' : ''} drafts/month`, ...plan.features.slice(1)]
                  : plan.features;

              return (
                <div key={plan.key} className="rounded-3xl border border-gold/30 bg-[#07111f] p-6 shadow-[0_0_35px_rgba(212,175,55,0.08)] flex flex-col relative overflow-hidden">
                  {isActivePlan && <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-3xl pointer-events-none" />}
                  
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-semibold text-gold">
                      {plan.key === 'free' ? freeLabel : plan.label}
                    </h2>
                    <div className="flex flex-col items-end gap-1">
                      {'isPopular' in plan && plan.isPopular && (
                        <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">Most Popular</span>
                      )}
                      {isActivePlan && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Current Plan</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-cream/70">{draftDescription}</p>
                  
                  {plan.key === 'free' ? (
                    <p className="mt-4 text-4xl font-semibold text-cream">₹0</p>
                  ) : (
                    <div className="mt-5">
                      <p className="text-4xl font-extrabold leading-tight text-[#d4af37]">
                        {formatRupees(billingCycle === 'annual' ? plan.annualAmount : plan.monthlyAmount)}
                        <span className="text-sm font-medium text-cream/65">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                      </p>
                      {billingCycle === 'annual' ? (
                        <div className="mt-2 space-y-1 text-sm text-cream/70">
                          <p>{formatRupees(Math.round(plan.annualAmount / 12))}/month effective</p>
                          <p className="font-semibold text-emerald-300">
                            Save {annualSavingsPercent(plan.monthlyAmount, plan.annualAmount)}% vs monthly
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <ul className="mt-6 space-y-2 text-sm text-cream/70 flex-1">
                    {features.map(f => <li key={f}>• {f}</li>)}
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
                          onClick={() => void handleSubscribe(plan.key)}
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
            {paywall ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-gold/40 px-6 py-3 text-sm font-medium text-gold hover:bg-gold hover:text-[#020b14] transition-all"
              >
                Maybe later
              </button>
            ) : (
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-gold/40 px-6 py-3 text-sm font-medium text-gold hover:bg-gold hover:text-[#020b14] transition-all">
                Return to Dashboard
              </Link>
            )}
            
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
