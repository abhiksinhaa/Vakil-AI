'use client';

import { useState, useEffect } from 'react';
import { MATTERS, MATTER_SUBTYPES, DRAFT_TYPES } from '../data/legalDraftTypes';
import { LEGAL_DOCUMENT_CATALOG, LEGAL_DOCUMENT_CATEGORIES } from '../data/legalDocumentLibrary';
import {
  DYNAMIC_DOCUMENTS,
  normalizeDocumentName,
} from '../lib/legal-documents/registry';

const LIBRARY_CATEGORY_MATTERS: Record<string, string> = {
  'Civil Litigation': 'civil',
  'Criminal Law and Procedure': 'criminal',
  'Family Law': 'family',
  'Consumer, Banking and Financial Disputes': 'consumer',
  'Property and Real Estate': 'property',
  'Employment and Labour Law': 'employment',
  'Arbitration, Mediation, and Insolvency': 'arbitration',
};

const LIBRARY_MATTERS = LEGAL_DOCUMENT_CATEGORIES.map((category) => ({
  id: LIBRARY_CATEGORY_MATTERS[category.name] ?? `library-${category.id.toLowerCase()}`,
  label: MATTERS.find((matter) => matter.id === LIBRARY_CATEGORY_MATTERS[category.name])?.label
    ?? category.name,
}));

const SELECTABLE_MATTERS = [
  ...MATTERS,
  ...LIBRARY_MATTERS.filter((category) => !MATTERS.some((matter) => matter.id === category.id)),
];

const existingDropdownNames = new Set(
  Object.entries(MATTER_SUBTYPES)
    .flatMap(([matterId, draftIds]) => draftIds
      .filter((draftId) => Boolean(DRAFT_TYPES[draftId]))
      .flatMap((draftId) => [draftId, DRAFT_TYPES[draftId].label]))
    .map(normalizeDocumentName),
);

const addedDynamicNames = new Set<string>();
const dynamicDraftOptions = DYNAMIC_DOCUMENTS.flatMap((document) => {
  const workflowNames = new Set(
    [document.name, ...document.catalogueNames].map(normalizeDocumentName),
  );
  const catalogueRecords = LEGAL_DOCUMENT_CATALOG.filter((record) =>
    [record.name, ...record.aliases].some((name) => workflowNames.has(normalizeDocumentName(name))),
  );
  const catalogueRecord = catalogueRecords.find((record) => record.category === document.category)
    ?? catalogueRecords[0];

  if (!catalogueRecord) return [];

  const category = LEGAL_DOCUMENT_CATEGORIES.find((item) => item.name === catalogueRecord.category);
  if (!category) return [];

  const matterId = LIBRARY_CATEGORY_MATTERS[category.name] ?? `library-${category.id.toLowerCase()}`;
  const optionNames = [
    document.key,
    document.baselineTypeKey,
    document.schemaName,
    document.name,
    ...document.catalogueNames,
  ].filter((name): name is string => Boolean(name)).map(normalizeDocumentName);

  if (optionNames.some((name) => existingDropdownNames.has(name) || addedDynamicNames.has(name))) {
    return [];
  }
  optionNames.forEach((name) => addedDynamicNames.add(name));

  return [{
    id: `dynamic:${document.key}`,
    label: document.name,
    matterId,
    subcategory: catalogueRecord.subcategory || 'Other documents',
    document,
  }];
});

const dynamicDraftOptionsById = new Map(dynamicDraftOptions.map((option) => [option.id, option]));

interface DraftTypeSelectorProps {
  onSelect: (data: {
    matterId: string;
    draftTypeId: string;
    structure: string[];
    label: string;
    dynamicDocumentKey?: string;
  }) => void;
  defaultMatterId?: string;
  defaultDraftTypeId?: string;
}

export default function DraftTypeSelector({ onSelect, defaultMatterId, defaultDraftTypeId }: DraftTypeSelectorProps) {
  const [selectedMatter, setSelectedMatter] = useState(defaultMatterId || SELECTABLE_MATTERS[0].id);
  
  const existingDraftIds = MATTER_SUBTYPES[selectedMatter] || [];
  const matterDynamicOptions = dynamicDraftOptions.filter((option) => option.matterId === selectedMatter);
  const availableDraftIds = [
    ...existingDraftIds,
    ...matterDynamicOptions.map((option) => option.id),
  ];
  
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
      return;
    }

    const dynamicOption = dynamicDraftOptionsById.get(selectedDraft);
    if (selectedMatter && dynamicOption?.matterId === selectedMatter) {
      onSelect({
        matterId: selectedMatter,
        draftTypeId: dynamicOption.id,
        structure: dynamicOption.document.templateSections,
        label: dynamicOption.label,
        dynamicDocumentKey: dynamicOption.document.key,
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
          {SELECTABLE_MATTERS.map((matter) => (
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
            {existingDraftIds.map((draftId) => {
              const draft = DRAFT_TYPES[draftId];
              return draft ? (
                <option key={draftId} value={draftId}>
                  {draft.label}
                </option>
              ) : null;
            })}
            {Array.from(new Set(matterDynamicOptions.map((option) => option.subcategory))).map((subcategory) => (
              <optgroup key={subcategory} label={subcategory}>
                {matterDynamicOptions
                  .filter((option) => option.subcategory === subcategory)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
