'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import DraftItem from './DraftItem';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { DraftRecord, Matter } from '../lib/types';
import { stripMarkdown } from '../lib/stripMarkdown';
import {
  LEGAL_DOCUMENT_CATALOG,
  LEGAL_DOCUMENT_CATEGORIES,
} from '@/data/legalDocumentLibrary';
import { getDynamicDocumentForCatalogueName } from '@/lib/legal-documents/registry';

function DraftModal({ draft, onClose }: { draft: DraftRecord | null, onClose: () => void }) {
  if (!draft) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm" onClick={onClose}>
      <div className="card max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <h3 className="font-display text-lg text-gold">{draft.draft_type}</h3>
            <p className="text-sm text-cream/50 mt-1">
              {new Date(draft.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-2xl leading-none">&times;</button>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap text-sm text-cream/90 leading-relaxed">
          {stripMarkdown(draft.generated_draft)}
        </pre>
      </div>
    </div>
  );
}

const SEARCHABLE_STATUS = {
  legal_review_required: 'Legal review required',
  internal_review: 'Internal review',
  verified: 'Verified',
};

export default function LibraryPage() {
  const { session } = useApp();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [mattersMap, setMattersMap] = useState<Record<string, Matter>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    const { data: mData } = await supabase
      .from('matters')
      .select('id, title, case_type')
      .eq('user_id', session.user.id);

    const mmap: Record<string, Matter> = {};
    if (mData) {
      mData.forEach((m: any) => mmap[m.id] = m);
    }
    setMattersMap(mmap);

    const { data } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', session.user.id)
      .neq('draft_type', '_TMP_UPLOAD_')
      .order('created_at', { ascending: false });

    if (data) setDrafts(data as unknown as DraftRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.id]);

  const filteredDrafts = drafts.filter(d => {
    const term = search.toLowerCase();
    const title = (d.draft_type || '').toLowerCase();
    const party1 = (d.party1_name || '').toLowerCase();
    const party2 = (d.party2_name || '').toLowerCase();
    return title.includes(term) || party1.includes(term) || party2.includes(term);
  });

  const filteredCatalog = LEGAL_DOCUMENT_CATALOG.filter((doc) => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const normalizedQuery = search.toLowerCase().trim();
    if (!matchesCategory) return false;

    if (!normalizedQuery) return true;

    return [
      doc.name,
      doc.category,
      doc.subcategory,
      doc.description,
      doc.document_type,
      ...doc.aliases,
      ...doc.secondary_categories,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const catalogPreview = filteredCatalog.slice(0, 18);
  const readyCount = LEGAL_DOCUMENT_CATALOG.filter(
    doc => doc.implementation_status !== 'not_implemented'
      || Boolean(getDynamicDocumentForCatalogueName(doc.name)
        ?? doc.aliases.map(getDynamicDocumentForCatalogueName).find(Boolean)),
  ).length;
  const comingSoonCount = LEGAL_DOCUMENT_CATALOG.length - readyCount;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const groups = {
    Today: [] as DraftRecord[],
    Yesterday: [] as DraftRecord[],
    'This Week': [] as DraftRecord[],
    Earlier: [] as DraftRecord[],
  };

  filteredDrafts.forEach(d => {
    const date = new Date(d.created_at);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups.Today.push(d);
    } else if (date.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(d);
    } else if (date.getTime() > oneWeekAgo.getTime()) {
      groups['This Week'].push(d);
    } else {
      groups.Earlier.push(d);
    }
  });

  return (
    <div className="min-h-screen bg-navy pb-24">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gold/80">Library</p>
              <h1 className="font-display text-3xl text-cream mt-2">Indian Legal Document Catalogue</h1>
            </div>
            <div className="rounded-2xl border border-gold/40 bg-card px-4 py-2 text-sm text-gold">
              <p>{LEGAL_DOCUMENT_CATALOG.length} documents</p>
              <p className="mt-1 text-xs text-cream/60">
                {readyCount} templates available · legal review required · {comingSoonCount} coming soon
              </p>
            </div>
          </div>

          <div className="relative mt-6">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by document name, category, or matter type..."
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {['All', ...LEGAL_DOCUMENT_CATEGORIES.map(category => category.name)].map(category => {
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    isSelected
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border bg-card text-cream/70 hover:border-gold/50 hover:text-cream'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </header>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-cream">Document catalogue</h2>
            <span className="text-sm text-cream/50">
              {filteredCatalog.length} results
              {filteredCatalog.length > catalogPreview.length
                ? ` · showing ${catalogPreview.length}`
                : ''}
            </span>
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="card py-10 text-center text-cream/60">
              No catalogue entries match the current search.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {catalogPreview.map(doc => {
                const dynamicDocument = getDynamicDocumentForCatalogueName(doc.name)
                  ?? doc.aliases.map(getDynamicDocumentForCatalogueName).find(Boolean);
                const isReady = doc.implementation_status !== 'not_implemented' || Boolean(dynamicDocument);
                return (
                <article key={doc.id} className="card p-4 hover:border-gold/40 transition-colors">
                  {dynamicDocument && (
                    <Link
                      href={`/documents/${dynamicDocument.key}`}
                      className="mb-4 inline-flex rounded-lg bg-gold px-3 py-2 text-xs font-medium text-navy hover:bg-gold/90"
                    >
                      Create draft
                    </Link>
                  )}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gold/70">{doc.id}</p>
                      <h3 className="mt-2 text-lg font-medium text-cream">{doc.name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-cream/60">
                        {doc.document_type}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${
                          !isReady
                            ? 'border-border bg-card text-cream/60'
                            : 'border-green-500/40 bg-green-500/10 text-green-300'
                        }`}
                        title={
                          isReady
                            ? 'Template available; legal review is required. This is not a verified legal document.'
                            : 'Catalogue entry only; generation is not implemented.'
                        }
                      >
                        {isReady ? 'Template available · Legal review required' : 'Coming soon'}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-cream/65 leading-6">{doc.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-cream/60">
                    <span className="rounded-full border border-border px-2 py-1">{doc.category}</span>
                    {doc.subcategory && (
                      <span className="rounded-full border border-border px-2 py-1">{doc.subcategory}</span>
                    )}
                    {doc.secondary_categories.map(category => (
                      <span key={category} className="rounded-full border border-border px-2 py-1">
                        {category}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-cream/60">
                    <span>{doc.required_fields.length} required fields</span>
                    <span>{SEARCHABLE_STATUS[doc.review_status] ?? 'Review pending'}</span>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium text-cream mb-5">Recent drafts</h2>
          {loading ? (
            <div className="text-center py-12 text-cream/50">Loading drafts...</div>
          ) : filteredDrafts.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-cream/50 mb-6">
                {search ? 'No drafts match your search.' : 'No drafts yet. Create your first draft.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {(Object.keys(groups) as Array<keyof typeof groups>).map(group => {
                if (groups[group].length === 0) return null;

                return (
                  <section key={group}>
                    <h3 className="text-sm font-medium text-cream/50 uppercase tracking-wider mb-4">
                      {group}
                    </h3>
                    <div className="space-y-3">
                      {groups[group].map(draft => (
                        <DraftItem
                          key={draft.id}
                          draft={draft}
                          matter={draft.matter_id ? mattersMap[draft.matter_id] : undefined}
                          onView={setSelectedDraft}
                          onDeleted={fetchData}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <DraftModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
    </div>
  );
}
