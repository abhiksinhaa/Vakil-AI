import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { fetchRecentDrafts } from '../lib/supabase';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DraftModal({ draft, onClose }) {
  if (!draft) return null;

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
        <pre className="flex-1 overflow-auto whitespace-pre-wrap text-sm text-cream/90 leading-relaxed">
          {draft.generated_draft}
        </pre>
      </div>
    </div>
  );
}

export default function Dashboard({ session }) {
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
          <p className="text-gold/80 text-sm font-medium mb-1">Namaste,</p>
          <h1 className="font-display text-3xl sm:text-4xl text-cream mb-2">
            {displayName}
          </h1>
          <p className="text-cream/50 text-sm">
            Aaj kya draft banana hai? Form bhariye, AI turant tayyar karega.
          </p>
        </header>

        <Link
          to="/generate"
          className="card flex items-center justify-between gap-4 mb-10 group hover:border-gold/40 transition-colors"
        >
          <div>
            <h2 className="font-display text-xl text-gold mb-1">Naya Draft Banao</h2>
            <p className="text-cream/50 text-sm">
              Legal Notice, Rent Agreement, Affidavit aur aur bhi
            </p>
          </div>
          <span className="btn-primary shrink-0 group-hover:bg-gold/90">Start →</span>
        </Link>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-cream">Recent Drafts</h2>
            {drafts.length > 0 && (
              <Link to="/history" className="text-sm text-gold hover:underline">
                View all
              </Link>
            )}
          </div>

          {loading && (
            <div className="card text-center py-8 text-cream/50 text-sm">Loading…</div>
          )}

          {!loading && drafts.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-cream/50 text-sm mb-4">Abhi koi draft save nahi hua</p>
              <Link to="/generate" className="btn-primary text-sm">
                Pehla Draft Banao
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

      <DraftModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
    </div>
  );
}
