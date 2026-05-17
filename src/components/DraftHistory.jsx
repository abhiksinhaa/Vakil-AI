import { useEffect, useMemo, useState } from 'react';
import Navbar from './Navbar';
import { fetchAllDrafts } from '../lib/supabase';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ViewModal({ draft, onClose }) {
  if (!draft) return null;

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
            <h3 className="font-display text-lg text-gold">{draft.draft_type}</h3>
            <p className="text-sm text-cream/50 mt-1">
              {draft.party1_name} vs {draft.party2_name || '—'} · {formatDate(draft.created_at)}
            </p>
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

export default function DraftHistory() {
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
              {search ? 'Koi draft match nahi hua' : 'Abhi koi saved draft nahi hai'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-navy/50">
                    <th className="text-left py-3 px-4 text-cream/60 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-cream/60 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-cream/60 font-medium">Party 1</th>
                    <th className="text-left py-3 px-4 text-cream/60 font-medium hidden sm:table-cell">
                      Party 2
                    </th>
                    <th className="text-right py-3 px-4 text-cream/60 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((draft) => (
                    <tr
                      key={draft.id}
                      className="border-b border-border/50 last:border-0 hover:bg-navy/30"
                    >
                      <td className="py-3 px-4 text-cream/80 whitespace-nowrap">
                        {formatDate(draft.created_at)}
                      </td>
                      <td className="py-3 px-4 text-cream">{draft.draft_type}</td>
                      <td className="py-3 px-4 text-cream/80">{draft.party1_name || '—'}</td>
                      <td className="py-3 px-4 text-cream/80 hidden sm:table-cell">
                        {draft.party2_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewDraft(draft)}
                          className="text-gold hover:underline text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <ViewModal draft={viewDraft} onClose={() => setViewDraft(null)} />
    </div>
  );
}
