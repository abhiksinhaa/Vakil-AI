'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import DraftItem from './DraftItem';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { DraftRecord, Matter } from '../lib/types';
import { stripMarkdown } from '../lib/stripMarkdown';

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

export default function LibraryPage() {
  const { session } = useApp();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [mattersMap, setMattersMap] = useState<Record<string, Matter>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    
    // Fetch matters for mapping
    const { data: mData } = await supabase
      .from('matters')
      .select('id, title, case_type')
      .eq('user_id', session.user.id);
      
    const mmap: Record<string, Matter> = {};
    if (mData) {
      mData.forEach((m: any) => mmap[m.id] = m);
    }
    setMattersMap(mmap);

    // Fetch drafts
    const { data } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (data) setDrafts(data as unknown as DraftRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.id]);

  // Filter and Group
  const filteredDrafts = drafts.filter(d => {
    const term = search.toLowerCase();
    const title = (d.draft_type || '').toLowerCase();
    const party1 = (d.party1_name || '').toLowerCase();
    const party2 = (d.party2_name || '').toLowerCase();
    return title.includes(term) || party1.includes(term) || party2.includes(term);
  });

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl text-cream mb-6">Recent Drafts</h1>
          
          <div className="relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text"
              placeholder="Search drafts by type or party name..."
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

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
      </main>

      <DraftModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
    </div>
  );
}
