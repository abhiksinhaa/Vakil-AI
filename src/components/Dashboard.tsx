'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import CourtNewsCarousel from './CourtNewsCarousel';
import { fetchRecentDrafts } from '../lib/firestore';
import { stripMarkdown } from '../lib/stripMarkdown';
import { useApp } from '../context/AppContext';
import { FREE_DRAFT_LIMIT } from '../lib/userAccount';
import { startPayPerUseCheckout } from '../lib/razorpay';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DraftModal({ draft, onClose, profile }) {
  const [unlockedState, setUnlockedState] = useState(false);
  
  if (!draft) return null;

  const showPaywall = draft.unlocked === false && !unlockedState;
  const fullText = stripMarkdown(draft.generated_draft);
  const displayText = showPaywall ? fullText.slice(0, Math.floor(fullText.length / 2)) : fullText;

  const handleUnlock = async () => {
    try {
      await startPayPerUseCheckout({
        userEmail: auth.currentUser?.email || '',
        userName: profile?.full_name || profile?.user_name || '',
        onSuccess: async () => {
          setUnlockedState(true);
          if (draft.id && profile?.user_id) {
            try {
              await updateDoc(doc(db, 'users', profile.user_id, 'drafts', draft.id), { unlocked: true });
              draft.unlocked = true;
            } catch (err) {
              console.error('Failed to update draft unlocked status:', err);
            }
          }
        }
      });
    } catch (err) {
      alert(err.message || 'Payment failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <h3 className="font-display text-lg text-gold">{draft.draft_type}</h3>
            <p className="text-sm text-cream/50 mt-1">{formatDate(draft.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cream/50 hover:text-cream text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="relative flex-1 overflow-auto">
          <pre className={`whitespace-pre-wrap text-sm text-cream/90 leading-relaxed ${showPaywall ? 'overflow-hidden pb-32 mb-4' : ''}`}>
            {displayText}
          </pre>
          {showPaywall && (
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-navy via-navy/90 to-transparent flex flex-col items-center justify-end pb-4 px-4 text-center">
              <p className="text-gold font-display text-lg mb-1">🔒 Unlock Full Draft</p>
              <p className="text-cream/80 text-sm mb-4">Pay ₹50 to unlock this draft</p>
              <button onClick={handleUnlock} className="btn-primary text-sm shadow-lg shadow-gold/20">
                Unlock - ₹50
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { session, subscription, isPro, profile } = useApp();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Advocate';

  useEffect(() => {
    fetchRecentDrafts(5)
      .then(setDrafts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-10">
          <p className="text-gold/80 text-sm font-medium mb-1">Welcome,</p>
          <h1 className="font-display text-3xl sm:text-4xl text-cream mb-2">
            {displayName}
          </h1>
          <p className="text-cream/50 text-sm">
            What draft would you like to create today? Fill the form, and AI will prepare it instantly.
          </p>
        </header>

        <Link
          href="/generate"
          className="card flex items-center justify-between gap-4 mb-10 group hover:border-gold/40 transition-colors"
        >
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="font-display text-xl text-gold">Create New Draft</h2>
              {subscription && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPro ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-cream/10 text-cream/80 border border-cream/20'}`}>
                  {isPro ? 'Pro: Unlimited' : `${Math.max(0, FREE_DRAFT_LIMIT - (subscription.drafts_this_month || 0))} free drafts left`}
                </span>
              )}
            </div>
            <p className="text-cream/50 text-sm">
              Legal Notice, Rent Agreement, Affidavit and more
            </p>
          </div>
          <span className="btn-primary shrink-0 group-hover:bg-gold/90">Start →</span>
        </Link>

        <CourtNewsCarousel />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-cream">Recent Drafts</h2>
            {drafts.length > 0 && (
              <Link href="/history" className="text-sm text-gold hover:underline">
                View all
              </Link>
            )}
          </div>

          {loading && (
            <div className="card text-center py-8 text-cream/50 text-sm">Loading…</div>
          )}

          {!loading && drafts.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-cream/50 text-sm mb-4">No drafts saved yet</p>
              <Link href="/generate" className="btn-primary text-sm">
                Create Your First Draft
              </Link>
            </div>
          )}

          {!loading && drafts.length > 0 && (
            <ul className="space-y-3">
              {drafts.map((draft) => (
                <li key={draft.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDraft(draft)}
                    className="card w-full text-left hover:border-gold/30 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-cream">{draft.draft_type}</p>
                        <p className="text-sm text-cream/50 mt-1">
                          {draft.party1_name}
                          {draft.party2_name ? ` vs ${draft.party2_name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-cream/40 shrink-0">
                        {formatDate(draft.created_at)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <DraftModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} profile={profile} />
    </div>
  );
}
