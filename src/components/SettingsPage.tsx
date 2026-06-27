'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import TermsContent from './TermsContent';
import PrivacyContent from './PrivacyContent';
import FeedbackModal from './FeedbackModal';

export default function SettingsPage() {
  const { session, subscription, isPro } = useApp();
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [bugText, setBugText] = useState('');
  const [showBugSuccess, setShowBugSuccess] = useState(false);

  const handleSendBugReport = () => {
    if (!bugText.trim()) return;
    
    const mailtoLink = `mailto:abhiksinha1523@gmail.com?subject=Bug%20Report%20-%20Draftee&body=${encodeURIComponent(bugText)}`;
    window.location.href = mailtoLink;
    
    setShowBugSuccess(true);
    
    setTimeout(() => {
      setModalContent(null);
      setBugText('');
      setShowBugSuccess(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl sm:text-3xl text-gold mb-6">Settings</h1>

        <section className="card space-y-4">
          <h2 className="font-display text-lg text-gold">Account</h2>
          <div className="grid gap-3">
            <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm">
              <p className="text-cream/70 mb-2">Signed in as</p>
              <p className="text-cream truncate max-w-full">{session?.user?.email || '—'}</p>
            </div>
            <Link
              href="/refer"
              className="px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Refer & Earn rewards for your network
            </Link>
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Subscription & Billing</h2>
          <div className="grid gap-3">
            <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm">
              <p className="text-cream/70 mb-2">Current plan</p>
              <p className="text-cream font-medium">{subscription ? (subscription.plan === 'pro' ? 'Pro' : 'Free') : 'Free'}</p>
              {subscription?.pro_until && subscription.plan === 'pro' ? (
                <p className="text-cream/50 text-xs mt-1">Expires {new Date(subscription.pro_until).toLocaleDateString()}</p>
              ) : null}
            </div>
            <Link
              href="/pricing"
              className="px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Manage subscription and billing
            </Link>
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Draft Preferences</h2>
          <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm text-cream/60">
            Set draft defaults from the generation workflow. Draft preferences are applied when creating new documents in Draftee.
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Document Settings</h2>
          <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm text-cream/60">
            Configure document formatting, export options, and default templates from the drafting pages.
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Notifications</h2>
          <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm text-cream/60">
            Notification preferences for Draftee are managed across the app. Use the Neikx AI sidebar for assistant-specific alerts.
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Referral & Rewards</h2>
          <div className="grid gap-3">
            <Link
              href="/refer"
              className="px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              View referral rewards and invite colleagues
            </Link>
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Privacy & Security</h2>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setModalContent('privacy')}
              className="w-full text-left px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Review our privacy policy
            </button>
            <button
              type="button"
              onClick={() => setModalContent('terms')}
              className="w-full text-left px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Review terms of use
            </button>
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">Usage Analytics</h2>
          <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm text-cream/60">
            Draftee collects anonymous usage data to improve draft quality and performance. Your data is handled securely and only used to improve the product.
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">App Preferences</h2>
          <div className="px-4 py-4 bg-navy/50 border border-border rounded-3xl text-sm text-cream/60">
            App preferences are available in the Draftee experience. Neikx AI-specific appearance settings are managed in the chatbot sidebar.
          </div>
        </section>

        <section className="card space-y-4 mt-6">
          <h2 className="font-display text-lg text-gold">About</h2>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => {
                setBugText('');
                setShowBugSuccess(false);
                setModalContent('bug');
              }}
              className="w-full text-left px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Report a bug
            </button>
            <button
              type="button"
              onClick={() => setModalContent('feedback')}
              className="w-full text-left px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Send feedback
            </button>
            <Link
              href="/help"
              className="px-4 py-4 bg-navy/50 border border-border rounded-3xl hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm"
            >
              Help Center
            </Link>
          </div>
        </section>
      </div>

      {modalContent === 'bug' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="font-display text-xl text-gold">Report a Bug</h2>
              <button
                onClick={() => setModalContent(null)}
                className="p-2 -mr-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {showBugSuccess ? (
                <div className="py-12 text-center text-gold animate-in fade-in">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-display text-xl">Thank you!</p>
                  <p className="text-cream/70 mt-2">Your report has been submitted.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-cream/90 text-sm font-medium mb-2">
                      What happened?
                    </label>
                    <textarea
                      value={bugText}
                      onChange={(e) => setBugText(e.target.value.slice(0, 2000))}
                      placeholder="Tell us about the issue you encountered"
                      className="w-full bg-navy/50 border border-border rounded-xl p-3 text-cream placeholder:text-cream/30 focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all min-h-[160px] resize-y"
                    />
                    <div className="text-right text-xs text-cream/40 mt-1">
                      {bugText.length} / 2000
                    </div>
                  </div>
                  
                  <p className="text-xs text-cream/50 leading-relaxed">
                    Any information you share may be reviewed to help improve Draftee. If you have additional questions, <a href="mailto:abhiksinha1523@gmail.com" className="text-gold hover:underline">contact support</a>.
                  </p>
                  
                  <button
                    onClick={handleSendBugReport}
                    disabled={!bugText.trim()}
                    className="btn-primary w-full py-3 text-base mt-2"
                  >
                    Send
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(modalContent === 'terms' || modalContent === 'privacy') && (
        <div className="fixed inset-0 z-[100] bg-navy flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <h2 className="font-display text-xl text-gold">
              {modalContent === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
            </h2>
            <button
              onClick={() => setModalContent(null)}
              className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-3xl mx-auto bg-card rounded-xl border border-border p-6 sm:p-8">
              {modalContent === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </div>
        </div>
      )}

      {modalContent === 'feedback' && (
        <FeedbackModal onClose={() => setModalContent(null)} />
      )}
    </div>
  );
}
