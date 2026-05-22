import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import {
  FREE_CHAT_DAILY_LIMIT,
  FREE_DRAFT_LIMIT,
  PRO_PRICE_INR,
  activateProPlan,
  checkChatAllowance,
  checkDraftAllowance,
} from '../lib/userAccount';
import { startProCheckout } from '../lib/razorpay';

function FeatureRow({ included, children, muted }) {
  return (
    <li className={`flex gap-2 text-sm ${muted ? 'text-cream/45' : 'text-cream/70'}`}>
      <span className={included ? 'text-gold shrink-0' : 'text-cream/30 shrink-0'}>
        {included ? '✓' : '✗'}
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage({ session }) {
  const location = useLocation();
  const { isPro, refreshAccount, profile } = useApp();
  const [allowance, setAllowance] = useState(null);
  const [chatAllowance, setChatAllowance] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    Promise.all([checkDraftAllowance(), checkChatAllowance()])
      .then(([draft, chat]) => {
        setAllowance(draft);
        setChatAllowance(chat);
      })
      .catch(console.error);
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
          const [draft, chat] = await Promise.all([
            checkDraftAllowance(),
            checkChatAllowance(),
          ]);
          setAllowance(draft);
          setChatAllowance(chat);
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
          Drafting + AI legal chatbot for Indian advocates
        </p>

        {location.state?.limitReached && !isPro && (
          <div className="mb-6 p-4 rounded-xl border border-gold/50 bg-gold/15 text-center text-cream text-sm">
            You&apos;ve used all {FREE_DRAFT_LIMIT} free drafts this month. Upgrade to Pro at
            ₹{PRO_PRICE_INR}/month for unlimited drafts and chat.
          </div>
        )}

        {location.state?.chatLimitReached && !isPro && (
          <div className="mb-6 p-4 rounded-xl border border-gold/50 bg-gold/15 text-center text-cream text-sm">
            Daily chat limit reached ({FREE_CHAT_DAILY_LIMIT} messages). Upgrade to Pro for
            unlimited chatbot access.
          </div>
        )}

        {paySuccess && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-center text-cream">
            Pro activated! Unlimited drafts & chat for 1 month.
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

            <p className="text-xs uppercase tracking-wider text-cream/50 mb-2">Draft generator</p>
            <ul className="space-y-2 mb-5">
              <FeatureRow included>{FREE_DRAFT_LIMIT} drafts per month</FeatureRow>
              <FeatureRow included>All document types</FeatureRow>
              <FeatureRow included>PDF & TXT export from drafts</FeatureRow>
              <FeatureRow included>Draft editor & share</FeatureRow>
            </ul>

            <p className="text-xs uppercase tracking-wider text-cream/50 mb-2">Legal chatbot</p>
            <ul className="space-y-2 flex-1 mb-6">
              <FeatureRow included>{FREE_CHAT_DAILY_LIMIT} chat messages per day</FeatureRow>
              <FeatureRow included={false} muted>
                Document / PDF upload
              </FeatureRow>
              <FeatureRow included={false} muted>
                Generate draft from chat
              </FeatureRow>
              <FeatureRow included={false} muted>
                Export chat as PDF
              </FeatureRow>
              <FeatureRow included={false} muted>
                Priority response
              </FeatureRow>
            </ul>

            {allowance && !isPro && (
              <p className="text-xs text-cream/50 mb-2">
                Drafts: {allowance.remaining}/{FREE_DRAFT_LIMIT} left this month
              </p>
            )}
            {chatAllowance && !isPro && (
              <p className="text-xs text-cream/50 mb-4">
                Chat: {chatAllowance.remaining}/{FREE_CHAT_DAILY_LIMIT} messages left today
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

            <p className="text-xs uppercase tracking-wider text-gold/80 mb-2">Draft generator</p>
            <ul className="space-y-2 mb-5">
              <FeatureRow included>Unlimited drafts</FeatureRow>
              <FeatureRow included>All document types</FeatureRow>
              <FeatureRow included>PDF & TXT export</FeatureRow>
              <FeatureRow included>WhatsApp & email share</FeatureRow>
            </ul>

            <p className="text-xs uppercase tracking-wider text-gold/80 mb-2">Legal chatbot</p>
            <ul className="space-y-2 flex-1 mb-6">
              <FeatureRow included>Unlimited chat messages</FeatureRow>
              <FeatureRow included>Upload documents & PDFs for analysis</FeatureRow>
              <FeatureRow included>Generate drafts directly from chat</FeatureRow>
              <FeatureRow included>Export chat conversation as PDF</FeatureRow>
              <FeatureRow included>Priority AI response</FeatureRow>
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
                {paying ? 'Opening payment…' : `Upgrade — ₹${PRO_PRICE_INR}/mo`}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-cream/40 mt-8">
          Refer 2 friends for 1 month Pro free (₹{PRO_PRICE_INR} value) —{' '}
          <Link to="/profile" className="text-gold hover:underline">
            get your referral link
          </Link>
        </p>
      </div>
    </div>
  );
}
