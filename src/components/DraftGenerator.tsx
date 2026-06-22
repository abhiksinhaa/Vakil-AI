'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import DraftPreview from './DraftPreview';
import FactsTextareaWithMic from './FactsTextareaWithMic';
import { generateLegalDraft } from '../lib/claude';
import { saveDraft } from '../lib/firestore';
import { useApp } from '../context/AppContext';
import {
  isAdvocateProfileComplete,
  checkDraftAllowance,
} from '../lib/userAccount';
import { DOCUMENT_SCHEMAS, DRAFT_TYPES } from '../lib/draftSchemas';

const INITIAL_FORM = {
  draftType: 'Affidavit',
  partyMentionStyle: 'simple',
  advocateName: '',
  barCouncilNumber: '',
  advocateCity: '',
  party1Name: '',
  party1Address: '',
  party2Name: '',
  party2Address: '',
  situation: '',
  language: 'English',
  incidentTiming: '',
  dynamicFields: {} as Record<string, string>,
};

export default function DraftGenerator() {
  const router = useRouter();
  const { profile, isPro, refreshAccount } = useApp();
  const [form, setForm] = useState(INITIAL_FORM);
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileFilled, setProfileFilled] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const [showAdvocateDetails, setShowAdvocateDetails] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        advocateName: profile.advocate_name || prev.advocateName,
        barCouncilNumber: profile.bar_council_number || prev.barCouncilNumber,
        advocateCity: profile.court_jurisdiction || prev.advocateCity,
      }));
      setProfileFilled(isAdvocateProfileComplete(profile));
    }
  }, [profile]);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const updateDynamic = (fieldId: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      dynamicFields: {
        ...prev.dynamicFields,
        [fieldId]: value,
      },
    }));
    setSaveSuccess(false);
  };

  const handleDraftTypeChange = (value: string) => {
    const schema = DOCUMENT_SCHEMAS[value];
    let style = 'include';
    if (schema.defaultPartyStyle === 'none') style = 'simple';
    if (schema.defaultPartyStyle === 'party1') style = 'party1_only';

    setForm((prev) => ({
      ...prev,
      draftType: value,
      partyMentionStyle: style,
      dynamicFields: {}, // Reset dynamic fields when changing types
    }));
    setSaveSuccess(false);
  };

  const runGenerate = async () => {
    const allowance = await checkDraftAllowance();
    if (!allowance.allowed) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const text = await generateLegalDraft({
        ...form,
        schema: DOCUMENT_SCHEMAS[form.draftType],
      });
      setDraft(text);
      await refreshAccount();
    } catch (err: any) {
      setError(err.message || 'Draft could not be generated. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      await saveDraft({
        draftType: form.draftType,
        party1Name: form.party1Name,
        party1Address: form.party1Address,
        party2Name: form.party2Name,
        party2Address: form.party2Address,
        situation: form.situation,
        dynamicFields: form.dynamicFields,
        schema: DOCUMENT_SCHEMAS[form.draftType],
        generatedDraft: draft,
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Save failed. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSchema = DOCUMENT_SCHEMAS[form.draftType];

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm">
          <div className="card max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-gold text-2xl">👑</span>
            </div>
            <h3 className="font-display text-2xl text-cream">Draft Limit Reached</h3>
            <p className="text-cream/80 leading-relaxed">
              You've used your 10 free drafts! Upgrade to Pro for unlimited drafts at ₹99/month.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="btn-primary w-full py-3"
              >
                Upgrade to Pro
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-sm text-cream/50 hover:text-cream transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-cream">
            Create New Draft
          </h1>
        </div>

        {profile && !profileFilled && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-cream/90 text-sm">
              Complete your advocate profile to auto-fill details.
            </p>
            <Link href="/profile" className="btn-primary text-sm shrink-0 text-center">
              Complete Profile
            </Link>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:min-h-[calc(100vh-12rem)]">
          <form
            className="lg:w-[40%] shrink-0 space-y-6 overflow-y-auto max-h-none lg:max-h-[calc(100vh-10rem)] lg:pr-2 pb-10"
            onSubmit={(e) => {
              e.preventDefault();
              runGenerate();
            }}
          >
            {/* DOCUMENT TYPE SELECTOR */}
            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Document Type</h2>
              <div>
                <select
                  id="draftType"
                  value={form.draftType}
                  onChange={(e) => handleDraftTypeChange(e.target.value)}
                  className="w-full text-base py-3"
                >
                  {DRAFT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* PARTY MENTION STYLE SELECTOR */}
              <div className="mt-4">
                <label htmlFor="partyMentionStyle">Include Party Details</label>
                <select
                  id="partyMentionStyle"
                  value={form.partyMentionStyle}
                  onChange={(e) => update('partyMentionStyle', e.target.value)}
                  className="w-full text-base py-3 mt-1"
                >
                  <option value="include">Party 1 & Party 2 Details</option>
                  <option value="party1_only">Party 1 Details Only</option>
                  <option value="simple">Simple Format (No Party Details)</option>
                </select>
              </div>
            </section>

            {/* PARTY DETAILS (Conditional) */}
            {(form.partyMentionStyle === 'include' || form.partyMentionStyle === 'party1_only') && (
              <section className="card space-y-4 border-l-4 border-l-gold/50">
                <h2 className="font-display text-lg text-gold">{currentSchema.party1Label} (Party 1)</h2>
                <div>
                  <label htmlFor="party1Name">Full Name</label>
                  <input
                    id="party1Name"
                    value={form.party1Name}
                    onChange={(e) => update('party1Name', e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label htmlFor="party1Address">Address</label>
                  <textarea
                    id="party1Address"
                    rows={2}
                    value={form.party1Address}
                    onChange={(e) => update('party1Address', e.target.value)}
                    placeholder="Enter complete address"
                  />
                </div>
              </section>
            )}

            {form.partyMentionStyle === 'include' && (
              <section className="card space-y-4 border-l-4 border-l-cream/20">
                <h2 className="font-display text-lg text-gold">{currentSchema.party2Label} (Party 2)</h2>
                <div>
                  <label htmlFor="party2Name">Full Name</label>
                  <input
                    id="party2Name"
                    value={form.party2Name}
                    onChange={(e) => update('party2Name', e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label htmlFor="party2Address">Address</label>
                  <textarea
                    id="party2Address"
                    rows={2}
                    value={form.party2Address}
                    onChange={(e) => update('party2Address', e.target.value)}
                    placeholder="Enter complete address"
                  />
                </div>
              </section>
            )}

            {/* COLLAPSIBLE ADVOCATE DETAILS */}
            <section className="card space-y-4 transition-all duration-300">
              <button 
                type="button" 
                onClick={() => setShowAdvocateDetails(!showAdvocateDetails)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="font-display text-lg text-gold">Advocate Details <span className="text-sm font-sans text-cream/50">(Optional)</span></h2>
                <span className={`text-gold transition-transform duration-300 ${showAdvocateDetails ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showAdvocateDetails && (
                <div className="pt-4 space-y-4 border-t border-border mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href="/profile" className="text-xs text-gold hover:underline shrink-0">
                      Edit profile
                    </Link>
                  </div>
                  <p className="text-xs text-cream/50 -mt-2">
                    Auto-filled from your saved profile
                  </p>
                  <div>
                    <label htmlFor="advocateName">Advocate Name</label>
                    <input
                      id="advocateName"
                      value={form.advocateName}
                      onChange={(e) => update('advocateName', e.target.value)}
                      placeholder="Adv. Rajesh Kumar"
                    />
                  </div>
                  <div>
                    <label htmlFor="barCouncilNumber">Bar Council Number</label>
                    <input
                      id="barCouncilNumber"
                      value={form.barCouncilNumber}
                      onChange={(e) => update('barCouncilNumber', e.target.value)}
                      placeholder="D/1234/2015"
                    />
                  </div>
                  <div>
                    <label htmlFor="advocateCity">City / Court</label>
                    <input
                      id="advocateCity"
                      value={form.advocateCity}
                      onChange={(e) => update('advocateCity', e.target.value)}
                      placeholder="Delhi District Court"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* DYNAMIC FIELDS PER DOCUMENT TYPE */}
            {currentSchema.fields.length > 0 && (
              <section className="card space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[40px] pointer-events-none"></div>
                <h2 className="font-display text-lg text-gold">{currentSchema.name} Details <span className="text-sm font-sans text-cream/50">(Optional)</span></h2>
                <div className="space-y-4">
                  {currentSchema.fields.map(field => (
                    <div key={field.id} className="relative z-10">
                      <label htmlFor={field.id}>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.id}
                          rows={2}
                          value={form.dynamicFields[field.id] || ''}
                          onChange={(e) => updateDynamic(field.id, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          className="w-full"
                        />
                      ) : (
                        <input
                          id={field.id}
                          type={field.type}
                          value={form.dynamicFields[field.id] || ''}
                          onChange={(e) => updateDynamic(field.id, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          className="w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FACTS & SITUATION (OPTIONAL) */}
            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Facts & Situation <span className="text-sm font-sans text-cream/50">(Optional)</span></h2>
              <div>
                <label htmlFor="situation">Situation / Facts</label>
                <FactsTextareaWithMic
                  id="situation"
                  value={form.situation}
                  onChange={(text) => update('situation', text)}
                  language={form.language}
                  placeholder="What happened? Write all the facts here... (use mic)"
                  required={false}
                />
              </div>
            </section>

            {/* GLOBALS (TIMING & LANGUAGE) */}
            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Generation Settings</h2>
              <fieldset>
                <legend className="text-sm text-cream/80 mb-2">
                  When did the incident occur? (For Criminal Law citations)
                </legend>
                <div className="grid gap-2">
                  {[
                    { value: 'before', label: 'Before 1 July 2024' },
                    { value: 'after', label: 'On or after 1 July 2024' },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className={`block w-full max-w-full overflow-hidden rounded-2xl border p-3 text-sm cursor-pointer transition-colors ${
                        form.incidentTiming === value
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'border-border text-cream/60 hover:border-gold/30'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <input
                          type="radio"
                          name="incidentTiming"
                          value={value}
                          checked={form.incidentTiming === value}
                          onChange={(e) => update('incidentTiming', e.target.value)}
                          className="accent-gold"
                        />
                        <span className="break-words">{label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
              
              <div>
                <label>Language Preference</label>
                <div className="flex gap-2 mt-2">
                  {['English', 'Hindi', 'Hinglish'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => update('language', lang)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.language === lang
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'border-border text-cream/60 hover:border-gold/30'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary w-full py-4 text-lg font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all hover:scale-[1.02]"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  Generating Document...
                </div>
              ) : (
                'Generate Document'
              )}
            </button>
          </form>

          <div className="lg:w-[60%] flex-1 min-h-[400px] lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)]">
            <DraftPreview
              draft={draft}
              onDraftChange={setDraft}
              formData={form}
              onRegenerate={runGenerate}
              onSave={handleSave}
              isGenerating={isGenerating}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              error={error}
              onRetry={runGenerate}
              profile={profile}
              refreshAccount={refreshAccount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
