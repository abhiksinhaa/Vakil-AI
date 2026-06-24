'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from './Navbar';
import { fetchAllDrafts } from '../lib/firestore';
import { stripMarkdown } from '../lib/stripMarkdown';
import { useApp } from '../context/AppContext';
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

function ViewModal({ draft, onClose, profile }) {
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

  let headerTitle = draft.draft_type;
  let headerSubtitle = formatDate(draft.created_at);
  if (draft.party1_name) {
    headerTitle = draft.party1_name;
    if (draft.party2_name) headerTitle += ` vs ${draft.party2_name}`;
    headerSubtitle = `${draft.draft_type} • ${formatDate(draft.created_at)}`;
  } else {
    headerTitle = `${draft.draft_type} - ${formatDate(draft.created_at)}`;
    headerSubtitle = 'Simple Format';
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <h3 className="font-display text-lg text-gold">{headerTitle}</h3>
            <p className="text-sm text-cream/50 mt-1">{headerSubtitle}</p>
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

export default function DraftHistory() {
  const { profile } = useApp();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewDraft, setViewDraft] = useState(null);

  useEffect(() => {
    fetchAllDrafts()
      .then(setDrafts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drafts;

    return drafts.filter((d) => {
      const dateStr = formatDate(d.created_at).toLowerCase();
      return (
        (d.party1_name || '').toLowerCase().includes(q) ||
        (d.party2_name || '').toLowerCase().includes(q) ||
        (d.draft_type || '').toLowerCase().includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [drafts, search]);

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl text-cream mb-2">Draft History</h1>
          <p className="text-cream/50 text-sm">Saare saved drafts — search by party ya date</p>
        </header>

        <div className="mb-6">
          <label htmlFor="search" className="sr-only">
            Search drafts
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by party name or date…"
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="card text-center py-12 text-cream/50">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-cream/50 text-sm">
              {search ? 'No matching drafts found' : 'No saved drafts yet'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="flex flex-col">
              {filtered.map((draft) => {
                let mainTitle = '';
                let subTitle = '';
                
                if (draft.party1_name) {
                  mainTitle = draft.party1_name;
                  if (draft.party2_name) {
                    mainTitle += ` vs ${draft.party2_name}`;
                  }
                  subTitle = `${draft.draft_type} • ${formatDate(draft.created_at)}`;
                } else {
                  mainTitle = `${draft.draft_type} - ${formatDate(draft.created_at)}`;
                  subTitle = 'Simple Format';
                }

                return (
                  <div
                    key={draft.id}
                    className="border-b border-border/50 last:border-0 hover:bg-navy/30 p-4 sm:px-6 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h2 className="text-lg font-medium text-cream">{mainTitle}</h2>
                      <p className="text-sm text-cream/60 mt-1">{subTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewDraft(draft)}
                      className="text-gold hover:text-gold/80 text-sm font-medium px-4 py-2 bg-gold/10 rounded-lg transition-colors border border-gold/20 hover:border-gold/40 whitespace-nowrap ml-4"
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <ViewModal draft={viewDraft} onClose={() => setViewDraft(null)} profile={profile} />
    </div>
  );
}
