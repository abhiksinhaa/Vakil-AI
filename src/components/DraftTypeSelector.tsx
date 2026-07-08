'use client';

import { useState, useEffect } from 'react';
import { MATTERS, MATTER_SUBTYPES, DRAFT_TYPES } from '../data/legalDraftTypes';

interface DraftTypeSelectorProps {
  onSelect: (data: { matterId: string; draftTypeId: string; structure: string[]; label: string }) => void;
  defaultMatterId?: string;
  defaultDraftTypeId?: string;
}

export default function DraftTypeSelector({ onSelect, defaultMatterId, defaultDraftTypeId }: DraftTypeSelectorProps) {
  const [selectedMatter, setSelectedMatter] = useState(defaultMatterId || MATTERS[0].id);
  
  // Available drafts for the selected matter
  const availableDraftIds = MATTER_SUBTYPES[selectedMatter] || [];
  
  const [selectedDraft, setSelectedDraft] = useState(
    defaultDraftTypeId && availableDraftIds.includes(defaultDraftTypeId)
      ? defaultDraftTypeId
      : availableDraftIds[0] || ''
  );

  useEffect(() => {
    // When matter changes, reset draft to the first available if current is not in the list
    const newAvailableIds = MATTER_SUBTYPES[selectedMatter] || [];
    if (!newAvailableIds.includes(selectedDraft) && newAvailableIds.length > 0) {
      setSelectedDraft(newAvailableIds[0]);
    }
  }, [selectedMatter, selectedDraft]);

  useEffect(() => {
    if (selectedMatter && selectedDraft && DRAFT_TYPES[selectedDraft]) {
      const draftData = DRAFT_TYPES[selectedDraft];
      onSelect({
        matterId: selectedMatter,
        draftTypeId: selectedDraft,
        structure: draftData.structure,
        label: draftData.label,
      });
    }
  }, [selectedMatter, selectedDraft, onSelect]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <div>
        <label htmlFor="matter-select" className="block text-sm text-gold/80 mb-1">
          Legal Matter
        </label>
        <select
          id="matter-select"
          value={selectedMatter}
          onChange={(e) => setSelectedMatter(e.target.value)}
          className="w-full text-base py-3 rounded-xl border border-gold/30 bg-[#06111a] text-cream focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
        >
          {MATTERS.map((matter) => (
            <option key={matter.id} value={matter.id}>
              {matter.label}
            </option>
          ))}
        </select>
      </div>

      {availableDraftIds.length > 0 && (
        <div>
          <label htmlFor="draft-select" className="block text-sm text-gold/80 mb-1">
            Specific Draft Type
          </label>
          <select
            id="draft-select"
            value={selectedDraft}
            onChange={(e) => setSelectedDraft(e.target.value)}
            className="w-full text-base py-3 rounded-xl border border-gold/30 bg-[#06111a] text-cream focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
          >
            {availableDraftIds.map((draftId) => {
              const draft = DRAFT_TYPES[draftId];
              return draft ? (
                <option key={draftId} value={draftId}>
                  {draft.label}
                </option>
              ) : null;
            })}
          </select>
        </div>
      )}
    </div>
  );
}
