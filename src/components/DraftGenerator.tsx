'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import DraftPreview from './DraftPreview';
import FeedbackPopup from './FeedbackPopup';
import FactsTextareaWithMic from './FactsTextareaWithMic';
import { generateLegalDraft, buildDraftPrompt } from '../lib/claude';
import { saveDraft } from '../lib/db';
import DraftTypeSelector from './DraftTypeSelector';
import { useApp } from '../context/AppContext';
import { startPayPerUseCheckout } from '../lib/razorpay';
import {
  isUserProfileComplete,
  checkDraftAllowance,
  incrementDraftUsage,
  DAILY_DRAFT_LIMIT,
  DAILY_DRAFT_LIMIT_MESSAGE,
  submitDraftFeedback,
  updateProfile,
} from '../lib/userAccount';
import { DOCUMENT_SCHEMAS } from '../lib/draftSchemas';
import { DRAFT_TYPES as NEW_DRAFT_TYPES } from '../data/legalDraftTypes';
import type { Profile } from '../lib/types';

const AFFIDAVIT_SUB_TYPES = [
  "Name Change Affidavit",
  "Address Proof/Residence Affidavit",
  "Date of Birth Affidavit",
  "Marriage Affidavit",
  "Joint Affidavit for Marriage Registration",
  "Lost Document Affidavit",
  "One and the Same Person Affidavit",
  "Income Affidavit",
  "No Objection Affidavit (NOC Affidavit)",
  "Gap Year Affidavit",
  "Heirship/Legal Heir Affidavit",
  "Affidavit for Correction in Documents",
  "Affidavit for Duplicate Certificates",
  "Property Affidavit",
  "Court Affidavit (Evidence/Reply/Rejoinder Affidavit)"
];

const INITIAL_FORM = {
  matterId: 'civil',
  draftType: 'plaint',
  draftTypeLabel: 'Plaint',
  structure: [] as string[],
  affidavitSubType: 'Court Affidavit (Evidence/Reply/Rejoinder Affidavit)',
  partyMentionStyle: 'simple',
  advocateName: '',
  barCouncilNumber: '',
  advocateCity: '',
  party1Name: '',
  party2Name: '',
  party1Address: '',
  party2Address: '',
  situation: '',
  language: 'English',
  incidentTiming: 'after',
  dynamicFields: {} as Record<string, string>,
};

const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Odia',
  'Assamese',
];

export default function DraftGenerator() {
  const router = useRouter();
  const { profile, isPro, refreshAccount, session, setProfile } = useApp();
  const [form, setForm] = useState(INITIAL_FORM);
  const [draft, setDraft] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('Generating Document...');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileFilled, setProfileFilled] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<false | 'advocate' | 'individual'>(false);
  const [offlineWarning, setOfflineWarning] = useState<string | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [dailyDraftUsage, setDailyDraftUsage] = useState(0);
  const [feedbackThreshold, setFeedbackThreshold] = useState<number>(3);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackSubmittedThisSession, setFeedbackSubmittedThisSession] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const DRAFT_COUNT_KEY = 'draftee_draft_count';
  const THRESHOLD_KEY = 'draftee_feedback_threshold';
  const SESSION_SUBMITTED_KEY = 'draftee_feedback_submitted_session';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCount = Number(window.localStorage.getItem(DRAFT_COUNT_KEY)) || 0;
      setDraftCount(storedCount);

      let t = window.localStorage.getItem(THRESHOLD_KEY);
      if (!t) {
        t = String(Math.random() < 0.5 ? 2 : 3);
        window.localStorage.setItem(THRESHOLD_KEY, t);
      }
      setFeedbackThreshold(Number(t));

      const submitted = window.sessionStorage.getItem(SESSION_SUBMITTED_KEY) === 'true';
      setFeedbackSubmittedThisSession(submitted);
    }
  }, []);

  useEffect(() => {
    if (
      draftCount > 0 &&
      draftCount >= feedbackThreshold &&
      !feedbackSubmittedThisSession &&
      !isGenerating &&
      !actionBusy
    ) {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
      console.log(`Conditions met for feedback popup (count: ${draftCount}, threshold: ${feedbackThreshold}). Waiting 2s...`);
      feedbackTimeoutRef.current = window.setTimeout(() => {
        console.log('Triggering feedback popup now.');
        setFeedbackVisible(true);
      }, 2000);
    }

    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [draftCount, feedbackThreshold, feedbackSubmittedThisSession, isGenerating, actionBusy]);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        advocateName: profile.advocate_name || prev.advocateName,
        barCouncilNumber: profile.bar_council_number || prev.barCouncilNumber,
        advocateCity: profile.court_jurisdiction || prev.advocateCity,
        language: profile.preferred_draft_language || profile.language || prev.language || 'English',
      }));
      setProfileFilled(isUserProfileComplete(profile));

      const profileCount = Number(profile.daily_draft_count ?? 0);
      if (Number.isFinite(profileCount)) {
        setDailyDraftUsage(Math.max(0, Math.min(DAILY_DRAFT_LIMIT, profileCount)));
      }
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timeoutId = window.setTimeout(() => {
      setDailyDraftUsage(0);
      void refreshAccount();
    }, nextMidnight.getTime() - now.getTime());

    return () => window.clearTimeout(timeoutId);
  }, [refreshAccount]);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const getSubmissionForm = (currentForm = form) => ({
    ...currentForm,
    dynamicFields: {
      ...currentForm.dynamicFields,
      ...(currentForm.draftType === 'Affidavit'
        ? { facts_and_statements: currentForm.situation || currentForm.dynamicFields.facts_and_statements || '' }
        : {}),
    },
  });

  const handleSituationChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      situation: value,
      dynamicFields: prev.draftType === 'Affidavit'
        ? {
            ...prev.dynamicFields,
            facts_and_statements: value,
          }
        : prev.dynamicFields,
    }));
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

  const persistDraftLanguage = async (nextLanguage?: string) => {
    const normalizedLanguage = (nextLanguage || 'English').trim() || 'English';
    setForm((prev) => ({ ...prev, language: normalizedLanguage }));

    if (!profile?.user_id) return;

    try {
      const updatedProfile = await updateProfile({
        preferred_draft_language: normalizedLanguage,
        language: normalizedLanguage,
      });
      setProfile((prev) => (prev ? { ...prev, ...updatedProfile, preferred_draft_language: normalizedLanguage, language: normalizedLanguage } : prev));
    } catch (err) {
      console.error('Failed to save draft language preference:', err);
    }
  };

  const handleLanguageChange = (value: string) => {
    const normalizedLanguage = (value || 'English').trim() || 'English';
    update('language', normalizedLanguage);
    void persistDraftLanguage(normalizedLanguage);
  };

  const getStoredDraftCount = () => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem(DRAFT_COUNT_KEY);
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const resetDraftCount = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_COUNT_KEY, '0');
    setDraftCount(0);
    const newT = Math.random() < 0.5 ? 2 : 3;
    window.localStorage.setItem(THRESHOLD_KEY, String(newT));
    setFeedbackThreshold(newT);
  };

  const incrementDraftCount = () => {
    if (typeof window === 'undefined') return;
    setDraftCount((prev) => {
      const nextCount = prev + 1;
      window.localStorage.setItem(DRAFT_COUNT_KEY, String(nextCount));
      console.log('Incremented draft count:', nextCount);
      return nextCount;
    });
  };

  const dismissFeedback = () => {
    setFeedbackVisible(false);
    resetDraftCount();
  };

  const handleFeedbackSubmit = async () => {
    if (!session?.user?.id || feedbackRating < 1) return;
    setFeedbackLoading(true);
    try {
      console.log('Submitting feedback:', { rating: feedbackRating, comment: feedbackComment });
      await submitDraftFeedback({
        user_id: session.user.id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || null,
        draft_type: form.draftType,
      });
      setFeedbackSuccess(true);
      setFeedbackSubmittedThisSession(true);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(SESSION_SUBMITTED_KEY, 'true');
      }
      resetDraftCount();
      window.setTimeout(() => {
        setFeedbackVisible(false);
        setFeedbackSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Feedback submit failed:', err);
      alert('Unable to submit feedback. Please try again later.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDraftActionBusyChange = (busy: boolean) => {
    setActionBusy(busy);
  };

  const handleDraftGenerated = () => {
    incrementDraftCount();
    setDailyDraftUsage((prev) => Math.min(prev + 1, DAILY_DRAFT_LIMIT));
  };

  const handleFeedbackSkip = () => {
    console.log('Feedback skipped');
    dismissFeedback();
  };

  const handleDraftTypeSelect = (data: { matterId: string; draftTypeId: string; structure: string[]; label: string }) => {
    let style = 'include';
    if (data.draftTypeId === 'affidavit') style = 'simple';

    setForm((prev) => ({
      ...prev,
      matterId: data.matterId,
      draftType: data.draftTypeId,
      draftTypeLabel: data.label,
      structure: data.structure,
      partyMentionStyle: style,
      dynamicFields: data.draftTypeId === 'affidavit'
        ? { facts_and_statements: prev.situation || prev.dynamicFields.facts_and_statements || '' }
        : {},
    }));
    setSaveSuccess(false);
  };


  const runGenerate = async () => {
    setIsGenerating(true);
    setGeneratingStatus('Checking allowance...');
    setError(null);
    setSaveSuccess(false);
    setDraftId(null);
    setOfflineWarning(null);

    try {
      try {
        console.log('Starting draft generation...');
        const allowance = await checkDraftAllowance();
        if (!allowance.allowed) {
          console.log('Draft limit reached, showing the daily-limit message');
          setIsGenerating(false);
          if (allowance.reason === 'daily_limit') {
            setShowUpgradeModal(false);
            setError(allowance.message || DAILY_DRAFT_LIMIT_MESSAGE);
          } else {
            setError(null);
            setShowUpgradeModal(allowance.userType === 'individual' ? 'individual' : 'advocate');
          }
          return;
        }
      } catch (allowanceErr: any) {
        // If offline or Supabase fails, we allow generation to proceed
        if (allowanceErr.message?.includes('offline') || allowanceErr.code === 'unavailable') {
          console.warn('Offline mode: Bypassing allowance check.');
        } else {
          console.error('Allowance check failed:', allowanceErr);
          console.warn('Proceeding with generation anyway (allowance check failed)');
        }
      }

      setGeneratingStatus('Generating Document...');

      const submissionForm = getSubmissionForm();
      console.log('Form data:', {
        draftType: submissionForm.draftType,
        advocateName: submissionForm.advocateName,
        party1Name: submissionForm.party1Name,
        language: submissionForm.language,
      });

      let userFactsText = `Advocate: ${submissionForm.advocateName || 'Not provided'}
City/Court: ${submissionForm.advocateCity || 'Not provided'}
Party 1: ${submissionForm.party1Name || 'Not provided'}
Party 2: ${submissionForm.party2Name || 'Not provided'}
Situation: ${submissionForm.situation || 'Not provided'}`;

      const customPrompt = submissionForm.structure && submissionForm.structure.length > 0
        ? buildDraftPrompt(submissionForm.draftTypeLabel || submissionForm.draftType, userFactsText, submissionForm.structure, submissionForm.language, submissionForm.incidentTiming)
        : undefined;

      const newSchema = NEW_DRAFT_TYPES[submissionForm.draftType];
      const schemaFallback = newSchema 
        ? {
            name: newSchema.label,
            party1Label: newSchema.party1Label,
            party2Label: newSchema.party2Label || 'Party 2 Details',
            fields: []
          }
        : DOCUMENT_SCHEMAS[submissionForm.draftType] || { 
            name: submissionForm.draftTypeLabel, 
            party1Label: 'Party 1 Details',
            party2Label: 'Party 2 Details',
            fields: [] 
          };

      console.log('Calling generateLegalDraft...');
      const text = await generateLegalDraft({
        ...submissionForm,
        schema: schemaFallback,
        customPrompt,
      }, (status) => setGeneratingStatus(status));
      
      console.log('Gemini response:', { textLength: text?.length });
      console.log('Draft generation successful, displaying to user');
      
      setDraft(text);
      setIsGenerating(false); // Stop loading immediately so user sees the draft
      handleDraftGenerated();

      try {
        await incrementDraftUsage();
      } catch (err) {
        console.error('Failed to update draft usage counter:', err);
      }

      // These can happen in the background without blocking the UI
      console.log('Refreshing account in background...');
      refreshAccount().catch(err => console.error('Failed to refresh account:', err));

      console.log('Auto-saving draft in background...');
      void saveDraft({
        draftType: submissionForm.draftType === 'Affidavit' ? `Affidavit - ${submissionForm.affidavitSubType}` : submissionForm.draftType,
        party1Name: submissionForm.party1Name,
        party1Address: submissionForm.party1Address,
        party2Name: submissionForm.party2Name,
        party2Address: submissionForm.party2Address,
        situation: submissionForm.situation,
        dynamicFields: submissionForm.dynamicFields,
        schema: schemaFallback,
        generatedDraft: text,
      })
        .then((res) => {
          if (res?.id) {
            console.log('Draft auto-save successful, id:', res.id);
            setDraftId(res.id);
            setSaveSuccess(true);
          } else {
            console.error('Draft auto-save did not return an id:', res);
            setSaveSuccess(false);
          }
        })
        .catch((err) => {
          console.error('Draft auto-save failed:', err);
          console.log('Draft is still displayed to user even though save failed');
          setSaveSuccess(false);
        });
    } catch (err: any) {
      console.error('Draft generation error:', err);
      console.log('Error if any:', err);
      setError(err.message || 'Draft could not be generated. Please try again.');
      setIsGenerating(false); // Ensure we stop loading on error
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const submissionForm = getSubmissionForm();
      await saveDraft({
        draftType: submissionForm.draftType === 'Affidavit' ? `Affidavit - ${submissionForm.affidavitSubType}` : submissionForm.draftType,
        party1Name: submissionForm.party1Name,
        party1Address: submissionForm.party1Address,
        party2Name: submissionForm.party2Name,
        party2Address: submissionForm.party2Address,
        situation: submissionForm.situation,
        dynamicFields: submissionForm.dynamicFields,
        schema: DOCUMENT_SCHEMAS[submissionForm.draftType] || { name: submissionForm.draftTypeLabel || submissionForm.draftType, fields: [] },
        generatedDraft: draft,
        // If we are in handleSave, it's manually triggered, but `runGenerate` already saved it. 
        // We'll keep default unlocked true, or fetch from state. For simplicity, since it's an auto-saved draft, it's safer to just let the backend handle it or omit if it exists.
        // Actually we can re-evaluate or use `allowance`.
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Save failed. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const newSchema = NEW_DRAFT_TYPES[form.draftType];
  const currentSchema = newSchema
    ? {
        name: newSchema.label,
        party1Label: newSchema.party1Label,
        party2Label: newSchema.party2Label || 'Party 2 Details',
        fields: []
      }
    : DOCUMENT_SCHEMAS[form.draftType] || { 
        name: form.draftTypeLabel || form.draftType, 
        party1Label: 'Party 1 Details', 
        party2Label: 'Party 2 Details', 
        fields: [] 
      };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      {showUpgradeModal === 'advocate' && (
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

      {showUpgradeModal === 'individual' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm">
          <div className="card max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-gold text-2xl">📝</span>
            </div>
            <h3 className="font-display text-2xl text-cream">Draft Limit Reached</h3>
            <p className="text-cream/80 leading-relaxed">
              You've used your 2 free drafts! Pay ₹50 to generate this draft.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await startPayPerUseCheckout({
                      userEmail: session?.user?.email || '',
                      userName: profile?.full_name || '',
                      onSuccess: () => {
                        setShowUpgradeModal(false);
                        runGenerate();
                      }
                    });
                  } catch (err: any) {
                    alert(err.message || 'Payment failed');
                  }
                }}
                className="btn-primary w-full py-3"
              >
                Pay ₹50
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
          <div
            className="lg:w-[40%] shrink-0 space-y-6 overflow-y-auto max-h-none lg:max-h-[calc(100vh-10rem)] lg:pr-2 pb-24"
          >
            <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-cream/80">
              Just 3 quick fields to generate — more details are optional.
            </div>

            {/* DOCUMENT TYPE SELECTOR */}
            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Document Type</h2>
              <DraftTypeSelector 
                onSelect={handleDraftTypeSelect} 
                defaultMatterId={form.matterId} 
                defaultDraftTypeId={form.draftType} 
              />
            </section>

            <section className="card space-y-4">
              <div>
                <label htmlFor="situation">Situation / Facts</label>
                <FactsTextareaWithMic
                  id="situation"
                  value={form.situation}
                  onChange={handleSituationChange}
                  language={form.language}
                  placeholder="What happened? Write all the facts here... (use mic)"
                  required={false}
                />
              </div>
            </section>

            {/* Language Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                color: '#c9a84c', 
                fontSize: '0.9rem', 
                fontWeight: 500,
                display: 'block',
                marginBottom: '8px'
              }}>
                Select Language
              </label>
              <select
                id="draftLanguage"
                value={form.language || 'English'}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full text-base py-3 mt-1"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <p className="text-xs text-cream/50 mt-2">This will be saved as your default draft language.</p>
            </div>

            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-cream/70">Daily draft quota</span>
              <span className="font-semibold text-gold">{dailyDraftUsage}/{DAILY_DRAFT_LIMIT} drafts used today</span>
            </div>

            {dailyDraftUsage >= DAILY_DRAFT_LIMIT && (
              <div className="mb-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-cream/90">
                <div className="font-semibold text-gold">Daily limit reached.</div>
                <div>Come back tomorrow for 3 more free drafts.</div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void runGenerate()}
              disabled={isGenerating || dailyDraftUsage >= DAILY_DRAFT_LIMIT}
              className="btn-primary sticky bottom-4 z-20 w-full py-4 text-lg font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  {generatingStatus}
                </div>
              ) : (
                'Generate Draft'
              )}
            </button>

            <section className="card space-y-4 transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="font-display text-lg text-gold">Add More Details (Optional) — improves accuracy</h2>
                <span className={`text-gold transition-transform duration-300 ${showAdvancedDetails ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showAdvancedDetails && (
                <div className="space-y-6 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2">
                  {/* PARTY MENTION STYLE SELECTOR */}
                  <div>
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

                  {/* PARTY DETAILS (Conditional) */}
                  {(form.partyMentionStyle === 'include' || form.partyMentionStyle === 'party1_only') && (
                    <section className="space-y-4 border-l-4 border-l-gold/50 pl-4">
                      <h3 className="font-display text-base text-gold">{currentSchema.party1Label} (Party 1) <span className="text-sm font-sans text-cream/50">(Optional)</span></h3>
                      <div>
                        <label htmlFor="party1Name">Full Name <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                        <input
                          id="party1Name"
                          value={form.party1Name}
                          onChange={(e) => update('party1Name', e.target.value)}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="party1Address">Address <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
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
                    <section className="space-y-4 border-l-4 border-l-cream/20 pl-4">
                      <h3 className="font-display text-base text-gold">{currentSchema.party2Label} (Party 2) <span className="text-sm font-sans text-cream/50">(Optional)</span></h3>
                      <div>
                        <label htmlFor="party2Name">Full Name <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                        <input
                          id="party2Name"
                          value={form.party2Name}
                          onChange={(e) => update('party2Name', e.target.value)}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="party2Address">Address <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
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

                  <section className="space-y-4 rounded-2xl border border-border/70 p-4">
                    <h3 className="font-display text-base text-gold">Advocate Details <span className="text-sm font-sans text-cream/50">(Optional)</span></h3>
                    <div className="flex items-center justify-between gap-2">
                      <Link href="/profile" className="text-xs text-gold hover:underline shrink-0">
                        Edit profile
                      </Link>
                    </div>
                    <p className="text-xs text-cream/50 -mt-2">
                      Auto-filled from your saved profile
                    </p>
                    <div>
                      <label htmlFor="advocateName">Advocate Name <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                      <input
                        id="advocateName"
                        value={form.advocateName}
                        onChange={(e) => update('advocateName', e.target.value)}
                        placeholder="Adv. Rajesh Kumar"
                      />
                    </div>
                    <div>
                      <label htmlFor="barCouncilNumber">Bar Council Number <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                      <input
                        id="barCouncilNumber"
                        value={form.barCouncilNumber}
                        onChange={(e) => update('barCouncilNumber', e.target.value)}
                        placeholder="D/1234/2015"
                      />
                    </div>
                    <div>
                      <label htmlFor="advocateCity">City / Court <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                      <input
                        id="advocateCity"
                        value={form.advocateCity}
                        onChange={(e) => update('advocateCity', e.target.value)}
                        placeholder="Delhi District Court"
                      />
                    </div>
                  </section>

                  {/* DYNAMIC FIELDS PER DOCUMENT TYPE */}
                  {currentSchema.fields.length > 0 && (
                    <section className="space-y-6 rounded-2xl border border-border/70 p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[40px] pointer-events-none"></div>
                      <h3 className="font-display text-base text-gold">{currentSchema.name} Details <span className="text-sm font-sans text-cream/50">(Optional)</span></h3>
                      <div className="space-y-4">
                        {currentSchema.fields.map(field => (
                          <div key={field.id} className="relative z-10">
                            <label htmlFor={field.id}>{field.label} <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
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

                  {/* GLOBALS (TIMING & LANGUAGE) */}
                  <section className="space-y-4 rounded-2xl border border-border/70 p-4">
                    <h3 className="font-display text-base text-gold">Generation Settings</h3>
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

                  </section>
                </div>
              )}
            </section>
          </div>

          <div className="lg:w-[60%] flex-1 min-h-[400px] lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)]">
            <DraftPreview
              draft={draft}
              draftId={draftId}
              onDraftChange={setDraft}
              formData={form}
              onRegenerate={runGenerate}
              onSave={handleSave}
              isGenerating={isGenerating}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              error={error}
              offlineWarning={offlineWarning}
              onRetry={runGenerate}
              profile={profile}
              refreshAccount={refreshAccount}
              onActionBusyChange={handleDraftActionBusyChange}
            />
          </div>
        </div>
      </div>
      <FeedbackPopup
        visible={feedbackVisible}
        rating={feedbackRating}
        comment={feedbackComment}
        loading={feedbackLoading}
        success={feedbackSuccess}
        draftType={form.draftTypeLabel || form.draftType}
        onRatingChange={setFeedbackRating}
        onCommentChange={setFeedbackComment}
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
      />
    </div>
  );
}
