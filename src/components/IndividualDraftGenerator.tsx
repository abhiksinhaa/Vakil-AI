'use client';

import { useRef, useState, useCallback } from 'react';
import { Copy, Download, Mail, MessageCircle } from 'lucide-react';
import DraftTypeSelector from './DraftTypeSelector';
import { useApp } from '../context/AppContext';
import { generateLegalDraft, buildDraftPrompt } from '../lib/claude';
import { DOCUMENT_SCHEMAS } from '../lib/draftSchemas';
import { DRAFT_TYPES } from '../data/legalDraftTypes';
import { downloadDraftPdf } from '../lib/exportDraftPdf';
import { openEmailDraft, openWhatsAppShare } from '../lib/shareDraft';
import { stripMarkdown } from '../lib/stripMarkdown';
import { supabase } from '../lib/supabase';

type IndividualDraftResult = { preview: string; draftId: string; draftLength: number };
type DraftForm = {
  matterId: string;
  draftType: string;
  draftTypeLabel: string;
  structure: string[];
  fullName: string;
  otherPartyName: string;
  address: string;
  situation: string;
};

const INITIAL_FORM: DraftForm = {
  matterId: 'civil',
  draftType: 'plaint',
  draftTypeLabel: 'Plaint',
  structure: DRAFT_TYPES.plaint.structure,
  fullName: '',
  otherPartyName: '',
  address: '',
  situation: '',
};

const REQUIRED_FIELDS: Array<{ key: 'fullName' | 'otherPartyName' | 'address' | 'situation'; label: string }> = [
  { key: 'fullName', label: 'Your Name' },
  { key: 'otherPartyName', label: 'Other Party Name' },
  { key: 'address', label: 'Address' },
  { key: 'situation', label: 'Situation / Facts' },
];

export default function IndividualDraftGenerator() {
  const { profile, session } = useApp();
  const [form, setForm] = useState(INITIAL_FORM);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [draftLength, setDraftLength] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const update = (key: keyof DraftForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setInvalidFields((current) => current.filter((field) => field !== key));
    setError('');
  };

  const selectDocumentType = useCallback((selection: { matterId: string; draftTypeId: string; structure: string[]; label: string }) => {
    setForm((current) => ({
      ...current,
      matterId: selection.matterId,
      draftType: selection.draftTypeId,
      draftTypeLabel: selection.label,
      structure: selection.structure,
    }));
  }, []);

  const generate = async () => {
    if (generating) return;
    const missing = REQUIRED_FIELDS.filter(({ key }) => !form[key].trim()).map(({ key }) => key);
    if (missing.length) {
      setInvalidFields(missing);
      requestAnimationFrame(() => {
        fieldRefs.current[missing[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldRefs.current[missing[0]]?.focus();
      });
      return;
    }

    setGenerating(true);
    setError('');
    setDraft('');
    setDraftLength(0);
    setDraftId(null);
    setUnlocked(false);
    try {
      const facts = `Your name: ${form.fullName}\nOther party name: ${form.otherPartyName}\nYour address: ${form.address}\nSituation and facts: ${form.situation}`;
      const schema = DRAFT_TYPES[form.draftType]
        ? {
            name: DRAFT_TYPES[form.draftType].label,
            party1Label: DRAFT_TYPES[form.draftType].party1Label,
            party2Label: DRAFT_TYPES[form.draftType].party2Label || 'Other Party',
            fields: [],
          }
        : DOCUMENT_SCHEMAS[form.draftType] || { name: form.draftTypeLabel, fields: [] };
      const result = await generateLegalDraft({
        individualDraft: true,
        individualDraftDetails: {
          documentType: form.draftTypeLabel,
          party1Name: form.fullName,
          party1Address: form.address,
          party2Name: form.otherPartyName,
          situation: form.situation,
        },
        draftType: form.draftType,
        draftTypeLabel: form.draftTypeLabel,
        party1Name: form.fullName,
        party1Address: form.address,
        party2Name: form.otherPartyName,
        partyMentionStyle: 'include',
        situation: form.situation,
        dynamicFields: {},
        schema,
        language: 'English',
        incidentTiming: 'after',
        structure: form.structure,
        customPrompt: buildDraftPrompt(form.draftTypeLabel, facts, form.structure, 'English', 'after'),
        userId: session?.user?.id,
      }) as unknown as IndividualDraftResult;

      if (!result?.preview || !result.draftId) throw new Error('Draft could not be saved. Please try again.');
      setDraft(result.preview);
      setDraftLength(result.draftLength);
      setDraftId(result.draftId);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Draft could not be generated. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const unlock = async () => {
    if (!draftId || paying || unlocked) return;
    setPaying(true);
    setError('');
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) throw new Error('Please sign in again before paying.');

      const orderResponse = await fetch('/api/razorpay/create-order-individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
        body: JSON.stringify({ draftId }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order?.error || 'Could not start payment. Please try again.');

      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) throw new Error('Payment service is still loading. Please try again.');
      const checkout = new RazorpayCheckout({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'Draftee',
        description: 'Unlock full legal draft',
        order_id: order.orderId,
        prefill: { name: profile?.full_name || '', email: session?.user?.email || '' },
        theme: { color: '#c9a84c' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-individual-draft', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.access_token}` },
              body: JSON.stringify({ ...response, draftId }),
            });
            const verification = await verifyResponse.json();
            if (!verifyResponse.ok || !verification.success || !verification.draft) {
              throw new Error(verification?.error || 'Payment could not be verified. Contact support with your payment ID.');
            }
            setDraft(verification.draft);
            setUnlocked(true);
          } catch (verificationError) {
            setError(verificationError instanceof Error ? verificationError.message : 'Payment verification failed.');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.on('payment.failed', (event: any) => {
        setError(event?.error?.description || 'Payment failed. Please try again.');
        setPaying(false);
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Payment could not be started.');
      setPaying(false);
    }
  };

  const fullText = stripMarkdown(draft);
  const previewText = fullText;
  const lockedHeight = Math.max(256, Math.ceil((draftLength - fullText.length) / 58) * 28);

  const copyDraft = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="individual-shell min-h-screen bg-navy text-cream">
      <header className="border-b border-gold/25 px-5 py-4">
        <div className="mx-auto max-w-5xl font-display text-2xl font-semibold text-gold">Draftee</div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-7 px-4 py-6 sm:px-6 sm:py-9 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl text-cream">Create a legal draft</h1>
          </div>

          <section className="rounded-lg border border-gold/25 bg-[#0f1525] p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gold">Document type</h2>
            <DraftTypeSelector
              onSelect={selectDocumentType}
              defaultMatterId={form.matterId}
              defaultDraftTypeId={form.draftType}
            />
          </section>

          <section className="space-y-4 rounded-lg border border-gold/25 bg-[#0f1525] p-4 sm:p-5">
            {REQUIRED_FIELDS.map(({ key, label }) => {
              const invalid = invalidFields.includes(key);
              const inputClass = `w-full ${invalid ? 'border-red-500 ring-2 ring-red-500/30' : ''}`;
              return (
                <div key={key}>
                  <label htmlFor={`individual-${key}`} className="text-cream/85">{label} <span className="text-red-400">*</span></label>
                  {key === 'situation' ? (
                    <textarea
                      id={`individual-${key}`}
                      ref={(node) => { fieldRefs.current[key] = node; }}
                      rows={6}
                      value={form[key]}
                      required
                      aria-required="true"
                      onChange={(event) => update(key, event.target.value)}
                      className={inputClass}
                      placeholder="Describe what happened and what you need the document to address."
                      aria-invalid={invalid}
                    />
                  ) : (
                    <input
                      id={`individual-${key}`}
                      ref={(node) => { fieldRefs.current[key] = node; }}
                      value={form[key]}
                      required
                      aria-required="true"
                      onChange={(event) => update(key, event.target.value)}
                      className={inputClass}
                      placeholder={key === 'address' ? 'Your complete address' : `Enter ${label.toLowerCase()}`}
                      aria-invalid={invalid}
                    />
                  )}
                  {invalid && <p className="mt-1.5 text-sm text-red-400">Please fill this field to generate your draft</p>}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="min-h-12 w-full rounded-lg bg-gold px-5 py-3 font-semibold text-[#0a0f1e] transition-colors hover:bg-[#e1c36f] disabled:cursor-wait disabled:opacity-60"
            >
              {generating ? 'Generating draft…' : 'Generate Draft'}
            </button>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          </section>
        </section>

        <section className="min-h-[360px] rounded-lg border border-gold/25 bg-[#0f1525] p-4 sm:p-5" aria-live="polite">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-display text-lg text-cream">Draft preview</h2>
            {draft && <span className="text-xs text-gold">{unlocked ? 'Unlocked' : 'Preview'}</span>}
          </div>

          {generating && <p className="py-12 text-center text-sm text-cream/60">Preparing your draft…</p>}
          {!generating && !draft && <p className="py-12 text-center text-sm text-cream/50">Your draft preview will appear here.</p>}
          {!generating && draft && (
            <>
              <pre className="whitespace-pre-wrap font-body text-sm leading-7 text-cream/90">{previewText}</pre>
              {!unlocked && (
                <div className="relative mt-1 overflow-hidden border-t border-gold/15 pt-4" style={{ minHeight: lockedHeight }}>
                  <div aria-hidden="true" className="locked-draft-lines select-none blur-[5px]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0f1e]/55 px-4 text-center">
                    <h3 className="font-display text-xl text-gold">Unlock Full Draft — ₹9 only</h3>
                    <button
                      type="button"
                      onClick={() => void unlock()}
                      disabled={!draftId || paying}
                      className="min-h-12 rounded-lg bg-gold px-6 py-3 font-semibold text-[#0a0f1e] hover:bg-[#e1c36f] disabled:opacity-60"
                    >
                      {paying ? 'Verifying payment…' : 'Pay ₹9 to Unlock'}
                    </button>
                  </div>
                </div>
              )}

              {unlocked && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <button type="button" onClick={() => void copyDraft()} title="Copy draft" aria-label="Copy draft" className="individual-action">
                    <Copy className="h-4 w-4" />{copied ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={() => void downloadDraftPdf(fullText, { draftType: form.draftTypeLabel, party1Name: form.fullName, party2Name: form.otherPartyName })} title="Download PDF" className="individual-action">
                    <Download className="h-4 w-4" />Download PDF
                  </button>
                  <button type="button" onClick={() => openWhatsAppShare(fullText)} title="Share on WhatsApp" className="individual-action">
                    <MessageCircle className="h-4 w-4" />WhatsApp
                  </button>
                  <button type="button" onClick={() => openEmailDraft({ body: fullText, draftType: form.draftTypeLabel })} title="Share by email" className="individual-action">
                    <Mail className="h-4 w-4" />Email
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <style jsx>{`
        .individual-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 2.75rem;
          padding: 0.6rem 0.8rem;
          border: 1px solid #3a4350;
          border-radius: 0.5rem;
          color: #e8e0d0;
          font-size: 0.875rem;
        }
        .individual-action:hover {
          border-color: #c9a84c;
          color: #c9a84c;
        }
        .locked-draft-lines {
          height: 100%;
          min-height: inherit;
          background: repeating-linear-gradient(to bottom, transparent 0, transparent 8px, rgb(232 224 208 / 0.58) 8px, rgb(232 224 208 / 0.58) 10px, transparent 10px, transparent 28px);
          mask-image: linear-gradient(to right, #000 0 92%, transparent 92%);
        }
      `}</style>
    </div>
  );
}