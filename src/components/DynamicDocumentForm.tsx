'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import Navbar from './Navbar';
import PricingPage from './PricingPage';
import { useApp } from '../context/AppContext';
import { saveDraft } from '../lib/db';
import { checkDraftAllowance } from '../lib/userAccount';
import { DraftGenerationError, generateLegalDraft } from '../lib/claude';
import { getFreeTrialStatus } from '../lib/plans';
import {
  buildDynamicDocumentPrompt,
  getActiveFields,
  toDraftSchema,
  validateDynamicDocument,
  type DynamicDocumentValues,
} from '../lib/legal-documents/engine';
import type { DynamicDocumentDefinition, DynamicField } from '../lib/legal-documents/registry';

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Assamese'];

function renderField(
  field: DynamicField,
  value: string,
  onChange: (value: string) => void,
  hasError: boolean,
) {
  const className = `w-full rounded-xl border bg-card px-3 py-2.5 text-cream outline-none focus:border-gold/60 ${
    hasError ? 'border-red-400' : 'border-border'
  }`;
  const commonProps = {
    id: field.id,
    name: field.id,
    required: field.required,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value),
    className,
    'aria-invalid': hasError,
  };

  if (field.type === 'textarea') {
    return <textarea {...commonProps} rows={4} maxLength={10000} placeholder={field.placeholder} />;
  }
  if (field.type === 'select') {
    return (
      <select {...commonProps}>
        <option value="">Select an option</option>
        {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  return (
    <input
      {...commonProps}
      type={field.type}
      min={field.type === 'number' ? 0 : undefined}
      step={field.type === 'number' ? 'any' : undefined}
      maxLength={field.type === 'text' ? 10000 : undefined}
      placeholder={field.placeholder}
    />
  );
}

export default function DynamicDocumentForm({ definition }: { definition: DynamicDocumentDefinition }) {
  const { session, profile, accountLoading } = useApp();
  const [values, setValues] = useState<DynamicDocumentValues>({});
  const [jurisdiction, setJurisdiction] = useState('');
  const [language, setLanguage] = useState('English');
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallNotice, setPaywallNotice] = useState<string | null>(null);
  const [freeDraftsRemaining, setFreeDraftsRemaining] = useState<number | null>(null);

  const fields = useMemo(() => getActiveFields(definition, values), [definition, values]);
  const fieldErrors = (field: DynamicField) => errors.some((error) => error.startsWith(`${field.label} `));
  const trial = profile?.plan === 'free' ? getFreeTrialStatus(profile.created_at) : null;

  useEffect(() => {
    if (!session?.user?.id || accountLoading) return;
    let active = true;
    checkDraftAllowance()
      .then((allowance) => {
        if (!active) return;
        setFreeDraftsRemaining(allowance.remaining);
        if (!allowance.isPro && !allowance.allowed && allowance.reason !== 'unauthenticated') {
          setPaywallNotice(allowance.message || null);
          setPaywallOpen(true);
        }
      })
      .catch((err) => console.error('Failed to check document allowance:', err));
    return () => {
      active = false;
    };
  }, [session?.user?.id, accountLoading]);

  const updateValue = (id: string, value: string) => {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors([]);
    setSaveMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneratedDraft('');
    setSaveMessage('');

    if (!session?.user?.id) {
      setErrors(['Sign in to generate a document.']);
      return;
    }

    setIsGenerating(true);
    setErrors([]);
    try {
      const allowance = await checkDraftAllowance();
      if (!allowance.allowed) {
        if (!allowance.isPro && allowance.reason !== 'unauthenticated') {
          setPaywallNotice(allowance.message || null);
          setPaywallOpen(true);
          return;
        }
        setErrors([allowance.message || 'Your draft allowance has been reached.']);
        return;
      }
      setFreeDraftsRemaining(allowance.remaining);
    } catch (allowanceError) {
      console.error('Failed to verify document allowance:', allowanceError);
      setErrors(['Could not verify your draft allowance. Please try again.']);
      return;
    } finally {
      setIsGenerating(false);
    }

    const validationErrors = validateDynamicDocument(definition, values);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsGenerating(true);
    setErrors([]);
    try {
      const promptValues = {
        ...values,
        __jurisdiction: jurisdiction.trim() || 'Not specified by user',
      };
      const customPrompt = buildDynamicDocumentPrompt(definition, promptValues, language);
      const schema = toDraftSchema(definition);
      const text = await generateLegalDraft({
        draftType: definition.name,
        draftTypeLabel: definition.name,
        partyMentionStyle: 'simple',
        situation: '',
        dynamicFields: values,
        schema,
        language,
        incidentTiming: 'unspecified',
        state: jurisdiction,
        customPrompt,
        userId: session.user.id,
        dynamicDocumentKey: definition.key,
      });

      setGeneratedDraft(text);
      window.dispatchEvent(new Event('draftee:draft-generated'));
      try {
        await saveDraft({
          draftType: definition.key,
          selectedDocumentType: definition.name,
          situation: jurisdiction ? `Jurisdiction: ${jurisdiction}` : '',
          dynamicFields: values,
          schema,
          generatedDraft: text,
        }, { trackUsage: true });
        setSaveMessage('Draft generated and saved to your drafts.');
      } catch (saveError) {
        console.error('Dynamic document draft save failed:', saveError);
        setSaveMessage('Draft generated, but could not be saved. Copy the text before leaving this page.');
      }
    } catch (generationError) {
      console.error('Dynamic document generation failed:', generationError);
      if (generationError instanceof DraftGenerationError && [
        'TRIAL_ENDED',
        'DAILY_LIMIT_REACHED',
        'FREE_LIMIT_REACHED',
      ].includes(generationError.code || '')) {
        setPaywallNotice(generationError.message);
        setPaywallOpen(true);
      } else {
        setErrors([generationError instanceof Error ? generationError.message : 'Draft generation failed. Please try again.']);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy pb-20">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/library" className="text-sm text-gold hover:text-gold/80">
          &larr; Back to catalogue
        </Link>
        <header className="mb-7 mt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold/70">{definition.category}</p>
          <h1 className="mt-2 font-display text-3xl text-cream">{definition.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-cream/65">{definition.purpose}</p>
          <p className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs leading-5 text-cream/70">
            This draft is generated from information you provide and requires qualified legal review.
            Empty optional details will not be invented; uncertain legal references must be verified.
          </p>
          {trial?.active && freeDraftsRemaining !== null && !accountLoading && (
            <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              trial.isLastTwoDays
                ? 'border-amber-400/70 bg-amber-500/15 text-amber-100'
                : 'border-gold/30 bg-gold/5 text-cream/75'
            }`}>
              {trial.isLastTwoDays ? 'Trial ka last stretch hai. ' : 'Your free trial: '}
              {trial.daysLeft} {trial.daysLeft === 1 ? 'day' : 'days'} left, {freeDraftsRemaining ?? 5} drafts left today.
              {' '}Daily limit resets at midnight IST.
            </p>
          )}
        </header>

        <form className="card space-y-6 p-5 sm:p-7" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label htmlFor={field.id} className="mb-1.5 block text-sm text-cream/85">
                  {field.label}
                  {field.required && <span className="ml-1 text-gold" aria-label="required">*</span>}
                </label>
                {renderField(field, values[field.id] ?? '', (value) => updateValue(field.id, value), fieldErrors(field))}
              </div>
            ))}
            <div>
              <label htmlFor="document-jurisdiction" className="mb-1.5 block text-sm text-cream/85">
                State/forum or jurisdiction (optional)
              </label>
              <input
                id="document-jurisdiction"
                value={jurisdiction}
                onChange={(event) => setJurisdiction(event.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-cream outline-none focus:border-gold/60"
                maxLength={300}
                placeholder="Enter only if known"
              />
            </div>
            <div>
              <label htmlFor="document-language" className="mb-1.5 block text-sm text-cream/85">Draft language</label>
              <select
                id="document-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-cream outline-none focus:border-gold/60"
              >
                {LANGUAGES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm text-cream/80">Draft structure</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-cream/60">
              {definition.templateSections.map((section) => <li key={section}>{section}</li>)}
            </ol>
          </details>

          {errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
              <ul className="list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="rounded-xl bg-gold px-5 py-3 font-medium text-navy transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? 'Checking allowance and generating…' : 'Generate draft'}
          </button>

          {saveMessage && <p role="status" className="text-sm text-cream/70">{saveMessage}</p>}
        </form>

        {generatedDraft && (
          <section className="card mt-7 p-5 sm:p-7">
            <h2 className="mb-4 text-lg font-medium text-cream">Generated draft</h2>
            <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-cream/85">{generatedDraft}</pre>
          </section>
        )}
      </main>
        {paywallOpen && (
          <PricingPage
            paywall
            notice={paywallNotice}
            onClose={() => setPaywallOpen(false)}
          />
        )}
    </div>
  );
}
