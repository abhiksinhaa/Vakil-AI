import { useState } from 'react';
import Navbar from './Navbar';
import DraftPreview from './DraftPreview';
import { generateLegalDraft } from '../lib/claude';
import { saveDraft } from '../lib/supabase';

const DRAFT_TYPES = [
  'Legal Notice',
  'Rent Agreement',
  'Affidavit',
  'Demand Letter',
  'Power of Attorney',
  'Partnership Agreement',
  'Employment Agreement',
  'Consumer Complaint',
  'Cheque Bounce Notice (NI Act Section 138)',
  'Vakalatnama',
];

const RESPONSE_TIMES = ['7 days', '15 days', '30 days', 'Custom'];

const INITIAL_FORM = {
  draftType: 'Legal Notice',
  advocateName: '',
  barCouncilNumber: '',
  advocateCity: '',
  party1Name: '',
  party1Address: '',
  party2Name: '',
  party2Address: '',
  situation: '',
  amount: '',
  responseTime: '15 days',
  customResponseTime: '',
  language: 'English',
};

export default function DraftGenerator() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const getResponseTime = () => {
    if (form.responseTime === 'Custom') {
      return form.customResponseTime || '15 days';
    }
    return form.responseTime;
  };

  const runGenerate = async () => {
    if (!form.situation.trim() || !form.party1Name.trim()) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const text = await generateLegalDraft({
        ...form,
        responseTime: getResponseTime(),
      });
      setDraft(text);
    } catch (err) {
      setError(err.message || 'Draft generate nahi hua. Dobara try karo.');
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
        amount: form.amount,
        generatedDraft: draft,
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Save failed. Check Supabase connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6 lg:py-8">
        <h1 className="font-display text-2xl sm:text-3xl text-cream mb-6">
          Naya Draft Banao
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:min-h-[calc(100vh-12rem)]">
          <form
            className="lg:w-[40%] shrink-0 space-y-6 overflow-y-auto max-h-none lg:max-h-[calc(100vh-10rem)] lg:pr-2"
            onSubmit={(e) => {
              e.preventDefault();
              runGenerate();
            }}
          >
            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Draft Type</h2>
              <div>
                <label htmlFor="draftType">Document</label>
                <select
                  id="draftType"
                  value={form.draftType}
                  onChange={(e) => update('draftType', e.target.value)}
                >
                  {DRAFT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Advocate Details</h2>
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
            </section>

            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Party 1 — Client</h2>
              <div>
                <label htmlFor="party1Name">Full Name</label>
                <input
                  id="party1Name"
                  value={form.party1Name}
                  onChange={(e) => update('party1Name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="party1Address">Address</label>
                <textarea
                  id="party1Address"
                  rows={3}
                  value={form.party1Address}
                  onChange={(e) => update('party1Address', e.target.value)}
                />
              </div>
            </section>

            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Party 2 — Opposite Party</h2>
              <div>
                <label htmlFor="party2Name">Full Name</label>
                <input
                  id="party2Name"
                  value={form.party2Name}
                  onChange={(e) => update('party2Name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="party2Address">Address</label>
                <textarea
                  id="party2Address"
                  rows={3}
                  value={form.party2Address}
                  onChange={(e) => update('party2Address', e.target.value)}
                />
              </div>
            </section>

            <section className="card space-y-4">
              <h2 className="font-display text-lg text-gold">Facts & Details</h2>
              <div>
                <label htmlFor="situation">Situation / Facts</label>
                <textarea
                  id="situation"
                  rows={5}
                  value={form.situation}
                  onChange={(e) => update('situation', e.target.value)}
                  placeholder="Kya hua hai? Saari facts yahan likho — date, amount, kya demand hai, kya steps pehle liye..."
                  required
                  className="min-h-[5rem]"
                />
              </div>
              <div>
                <label htmlFor="amount">Amount Involved (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/50">
                    ₹
                  </span>
                  <input
                    id="amount"
                    value={form.amount}
                    onChange={(e) => update('amount', e.target.value)}
                    className="pl-8"
                    placeholder="50,000"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="responseTime">Response Time Demanded (optional)</label>
                <select
                  id="responseTime"
                  value={form.responseTime}
                  onChange={(e) => update('responseTime', e.target.value)}
                >
                  {RESPONSE_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {form.responseTime === 'Custom' && (
                <div>
                  <label htmlFor="customResponseTime">Custom response period</label>
                  <input
                    id="customResponseTime"
                    value={form.customResponseTime}
                    onChange={(e) => update('customResponseTime', e.target.value)}
                    placeholder="e.g. 21 days"
                  />
                </div>
              )}
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
              disabled={isGenerating || !form.situation.trim() || !form.party1Name.trim()}
              className="btn-primary w-full py-3 text-base"
            >
              {isGenerating ? (
                <>
                  <span className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  Draft ban raha hai…
                </>
              ) : (
                'Generate Draft'
              )}
            </button>
          </form>

          <div className="lg:w-[60%] flex-1 min-h-[400px] lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)]">
            <DraftPreview
              draft={draft}
              formData={form}
              onRegenerate={runGenerate}
              onSave={handleSave}
              isGenerating={isGenerating}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              error={error}
              onRetry={runGenerate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
