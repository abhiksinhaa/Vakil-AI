import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import {
  FREE_DRAFT_LIMIT,
  PRO_PRICE_INR,
  activateProPlan,
  checkDraftAllowance,
} from '../lib/userAccount';
import { startProCheckout } from '../lib/razorpay';

export default function PricingPage({ session }) {
  const location = useLocation();
  const { isPro, refreshAccount, profile } = useApp();
  const [allowance, setAllowance] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    checkDraftAllowance().then(setAllowance).catch(console.error);
  }, [isPro]);

  const handleUpgrade = async () => {
    setPaying(true);
    setPayError(null);
    setPaySuccess(false);
    try {
      await startProCheckout({
        userEmail: session?.user?.email,
        userName: profile?.advocate_name || profile?.full_name,
        onSuccess: async () => {
          await activateProPlan(1);
          await refreshAccount();
          setPaySuccess(true);
          checkDraftAllowance().then(setAllowance);
        },
      });
    } catch (err) {
      setPayError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl sm:text-3xl text-gold mb-2 text-center">
          Plans & Pricing
        </h1>
        <p className="text-cream/60 text-sm text-center mb-10">
          Professional legal drafting for Indian advocates
        </p>

        {location.state?.limitReached && !isPro && (
          <div className="mb-6 p-4 rounded-xl border border-gold/50 bg-gold/15 text-center text-cream text-sm">
            You&apos;ve used all 3 free drafts this month. Upgrade to Pro for unlimited drafts.
          </div>
        )}

        {paySuccess && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-center text-cream">
            Pro activated! Unlimited drafts for 1 month.
          </div>
        )}

        {payError && (
          <div className="mb-6 p-4 rounded-xl border border-red-400/30 bg-red-400/10 text-center text-red-400 text-sm">
            {payError}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card flex flex-col">
            <h2 className="font-display text-xl text-cream mb-1">Free</h2>
            <p className="text-3xl font-display text-gold mb-4">
              ₹0<span className="text-sm text-cream/50 font-body">/month</span>
            </p>
            <ul className="text-sm text-cream/70 space-y-2 flex-1 mb-6">
              <li>✓ {FREE_DRAFT_LIMIT} drafts per month</li>
              <li>✓ All document types</li>
              <li>✓ PDF & TXT export</li>
              <li>✓ Legal chatbot</li>
            </ul>
            {allowance && !isPro && (
              <p className="text-xs text-cream/50 mb-4">
                {allowance.remaining} of {FREE_DRAFT_LIMIT} drafts left this month
              </p>
            )}
            <p className="btn-secondary w-full text-center cursor-default opacity-90">
              {!isPro ? 'Current plan' : '—'}
            </p>
          </div>

          <div className="card flex flex-col border-gold/40 ring-1 ring-gold/20">
            <span className="text-xs uppercase tracking-wider text-gold mb-2">Popular</span>
            <h2 className="font-display text-xl text-cream mb-1">Pro</h2>
            <p className="text-3xl font-display text-gold mb-4">
              ₹{PRO_PRICE_INR}
              <span className="text-sm text-cream/50 font-body">/month</span>
            </p>
            <ul className="text-sm text-cream/70 space-y-2 flex-1 mb-6">
              <li>✓ Unlimited drafts</li>
              <li>✓ Priority generation</li>
              <li>✓ WhatsApp & email share</li>
              <li>✓ Draft editor</li>
            </ul>
            {isPro ? (
              <p className="btn-primary w-full text-center opacity-80 cursor-default">
                Pro active ✓
              </p>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={paying}
                className="btn-primary w-full"
              >
                {paying ? 'Opening payment…' : 'Upgrade with Razorpay'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-cream/40 mt-8">
          Refer 2 friends for 1 month Pro free —{' '}
          <Link to="/profile" className="text-gold hover:underline">
            get your referral link
          </Link>
        </p>
      </div>
    </div>
  );
}
