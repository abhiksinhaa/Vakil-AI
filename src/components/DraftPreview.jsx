import { useState } from 'react';

export default function DraftPreview({
  draft,
  formData,
  onRegenerate,
  onSave,
  isGenerating,
  isSaving,
  saveSuccess,
  error,
  onRetry,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const handleDownload = () => {
    if (!draft) return;
    const type = formData?.draftType?.replace(/\s+/g, '_') || 'legal_draft';
    const blob = new Blob([draft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card h-full flex flex-col min-h-[400px] lg:min-h-0">
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
        <h2 className="font-display text-lg text-cream">Draft Preview</h2>
        {draft && !isGenerating && (
          <span className="text-xs text-gold/80 bg-gold/10 px-2 py-1 rounded">
            Ready
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto mb-4">
        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-4">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-cream/70 text-sm">Draft ban raha hai…</p>
          </div>
        )}

        {error && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-4 text-center px-4">
            <p className="text-red-400/90 text-sm">
              Draft generate nahi hua. Dobara try karo.
            </p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-primary text-sm">
                Retry
              </button>
            )}
          </div>
        )}

        {!isGenerating && !error && draft && (
          <pre className="animate-fade-in whitespace-pre-wrap font-body text-sm text-cream/90 leading-relaxed bg-navy/50 rounded-lg p-5 border border-border/50 print:text-black print:bg-white">
            {draft}
          </pre>
        )}

        {!isGenerating && !error && !draft && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center px-6">
            <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gold/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-cream/50 text-sm">
              Form bhariye aur Generate dabaiye — yahan draft dikhega
            </p>
          </div>
        )}
      </div>

      {draft && !isGenerating && !error && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <button type="button" onClick={handleCopy} className="btn-secondary text-sm">
            {copied ? 'Copied! ✓' : 'Copy to Clipboard'}
          </button>
          <button type="button" onClick={handleDownload} className="btn-secondary text-sm">
            Download .txt
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || saveSuccess}
            className="btn-secondary text-sm"
          >
            {saveSuccess ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save to History'}
          </button>
          <button type="button" onClick={onRegenerate} className="btn-primary text-sm ml-auto">
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
