'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { FREE_DRAFT_LIMIT } from '../lib/userAccount';

export default function PricingPage() {
  const { isPro } = useApp();
  const [showToast, setShowToast] = useState(false);

  const handleUpgradeClick = () => {
    if (isPro) return;
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col relative overflow-hidden">
      {/* Toast Notification */}
      <div 
        className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-gold text-navy font-medium px-6 py-3 rounded-full shadow-lg shadow-gold/20 flex items-center gap-2">
          <span>🚀</span>
          Coming Soon: Payment Integration!
        </div>
      </div>

      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
        
        <div className="text-center mb-12 relative z-10">
          <h1 className="font-display text-4xl sm:text-5xl text-gold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-cream/80 text-lg max-w-xl mx-auto">
            Upgrade to Pro for unlimited AI legal drafting and priority support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl relative z-10">
          
          {/* Free Plan */}
          <div className="card flex flex-col p-8 border-gold/10 hover:border-gold/30 transition-colors bg-navy/50 backdrop-blur-sm">
            <div className="mb-8">
              <h2 className="font-display text-2xl text-cream mb-2">Free</h2>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-display text-gold">₹0</span>
                <span className="text-cream/50">/lifetime</span>
              </div>
              <p className="text-cream/80">{FREE_DRAFT_LIMIT} Free Drafts for all new advocates.</p>
            </div>

            <div className="flex-1">
              <ul className="space-y-4 mb-8">
                {[
                  'Up to 10 highly-accurate legal drafts',
                  'BNS, BNSS, and BSA compliant drafting',
                  'Download drafts in PDF format',
                  'Basic formatting & sharing',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-cream/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              className={`w-full py-3 rounded-full font-semibold transition-colors border ${
                !isPro 
                  ? 'bg-cream/10 text-cream border-cream/20 cursor-default' 
                  : 'bg-transparent text-cream border-gold/30 hover:bg-gold/10'
              }`}
              disabled={!isPro}
            >
              {!isPro ? 'Current Plan' : 'Included'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="card flex flex-col p-8 border-gold/40 ring-1 ring-gold/20 bg-gradient-to-br from-navy to-gold/5 relative overflow-hidden transform hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-gold/10">
            {/* Background glow */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-64 h-64 bg-gold/10 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="absolute top-0 right-8 bg-gold text-navy text-xs font-bold px-3 py-1 rounded-b-lg tracking-wider">
              MOST POPULAR
            </div>

            <div className="mb-8 relative z-10">
              <h2 className="font-display text-2xl text-gold mb-2">Pro</h2>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-display text-cream">₹99</span>
                <span className="text-cream/50">/month</span>
              </div>
              <p className="text-cream/80">Unlimited access to all Draftee AI features.</p>
            </div>

            <div className="flex-1 relative z-10">
              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited legal draft generation',
                  'Unlimited legal chatbot messages',
                  'PDF & document upload in chatbot',
                  'Priority email & WhatsApp support',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-cream/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={handleUpgradeClick}
              className={`w-full py-3 rounded-full font-semibold transition-all relative z-10 shadow-lg ${
                isPro 
                  ? 'bg-cream/10 text-cream cursor-default border border-cream/20' 
                  : 'bg-gold text-navy hover:bg-gold/90 shadow-gold/25 hover:shadow-gold/40'
              }`}
            >
              {isPro ? 'Pro Active' : 'Upgrade Now'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
