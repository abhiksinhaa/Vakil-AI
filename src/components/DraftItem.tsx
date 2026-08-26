'use client';

import type { DraftRecord, Matter } from '../lib/types';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DraftItemProps {
  draft: DraftRecord;
  matter?: Matter;
  onView: (draft: DraftRecord) => void;
  onDeleted?: () => void;
}

export default function DraftItem({ draft, matter, onView, onDeleted }: DraftItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    setIsDeleting(true);
    await supabase.from('drafts').delete().eq('id', draft.id);
    setIsDeleting(false);
    setMenuOpen(false);
    if (onDeleted) onDeleted();
  };

  const title = draft.draft_type || 'Draft Document';
  const partyInfo = draft.party1_name ? `${draft.party1_name}${draft.party2_name ? ` vs ${draft.party2_name}` : ''}` : '';

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-gold/40 transition-colors">
      <div className="flex items-start gap-4 flex-1 min-w-0" onClick={() => onView(draft)} style={{ cursor: 'pointer' }}>
        <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-cream truncate">{title}</h4>
          {partyInfo && (
            <p className="text-sm text-cream/70 truncate mt-0.5">{partyInfo}</p>
          )}
          {matter && (
            <p className="text-xs text-gold truncate mt-1">{matter.title}</p>
          )}
          <p className="text-xs text-cream/40 mt-1">
            Edited on {new Date(draft.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        </div>
      </div>
      
      <div className="relative shrink-0" ref={menuRef}>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-cream/50 hover:text-gold rounded-lg hover:bg-gold/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden">
            <button 
              onClick={() => { setMenuOpen(false); onView(draft); }}
              className="w-full text-left px-4 py-2 text-sm text-cream hover:bg-gold/10 hover:text-gold transition-colors"
            >
              View
            </button>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
