import { useMemo, useState } from 'react';
import { downloadDraftPdf } from '../lib/exportDraftPdf';
import { stripMarkdown } from '../lib/stripMarkdown';
import { openEmailDraft, openWhatsAppShare } from '../lib/shareDraft';

export default function DraftPreview({
  draft,
  onDraftChange,
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
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');

  const displayDraft = useMemo(
    () => (draft ? stripMarkdown(draft) : ''),
    [draft]
  );

  const startEdit = () => {
    setEditBuffer(displayDraft);
    setIsEditing(true);
  };

  const saveEdits = () => {
    onDraftChange?.(editBuffer);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditBuffer('');
  };

  const handleCopy = async () => {
    if (!displayDraft) return;
    try {
      await navigator.clipboard.writeText(displayDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const handleDownloadTxt = () => {
    if (!displayDraft) return;
    const type = formData?.draftType?.replace(/\s+/g, '_') || 'legal_draft';
    const blob = new Blob([displayDraft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!displayDraft || isPdfLoading) return;
    setPdfError(null);
    setIsPdfLoading(true);
    try {
      await downloadDraftPdf(displayDraft, formData);
    } catch (err) {
      console.error('PDF export failed:', err);
      setPdfError('PDF could not be downloaded. Please try again.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!displayDraft) return;
    openWhatsAppShare(displayDraft);
  };

  const handleEmail = () => {
    if (!displayDraft) return;
    openEmailDraft({
      body: displayDraft,
      draftType: formData?.draftType,
    });
  };

  return (
    <div className="card h-full flex flex-col min-h-[400px] lg:min-h-0">
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
        <h2 className="font-display text-lg text-cream">Draft Preview</h2>
        {draft && !isGenerating && !isEditing && (
          <span className="text-xs text-gold/80 bg-gold/10 px-2 py-1 rounded">
            Ready
          </span>
        )}
        {isEditing && (
          <span className="text-xs text-gold bg-gold/20 px-2 py-1 rounded">Editing</span>
        )}
      </div>

      <div className="flex-1 overflow-auto mb-4 min-h-0">
        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-4">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-cream/70 text-sm">Generating draft...</p>
          </div>
        )}

        {error && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-4 text-center px-4">
            <p className="text-red-400/90 text-sm max-w-md">
              {typeof error === 'string' ? error : 'Draft could not be generated. Please try again.'}
            </p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-primary text-sm">
                Retry
              </button>
            )}
          </div>
        )}

        {!isGenerating && !error && draft && isEditing && (
          <textarea
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            className="w-full h-full min-h-[320px] text-sm leading-relaxed font-body resize-y"
            aria-label="Edit draft"
          />
        )}

        {!isGenerating && !error && draft && !isEditing && (
          <pre className="animate-fade-in whitespace-pre-wrap font-body text-sm text-cream/90 leading-relaxed bg-navy/50 rounded-lg p-5 border border-border/50 print:text-black print:bg-white">
            {displayDraft}
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
              Fill the form and click Generate — your draft will appear here
            </p>
          </div>
        )}
      </div>

      {pdfError && draft && !isGenerating && !error && (
        <p className="text-red-400/90 text-xs px-1 mb-2">{pdfError}</p>
      )}

      {draft && !isGenerating && !error && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          {isEditing ? (
            <>
              <button type="button" onClick={saveEdits} className="btn-primary text-sm">
                Save edits
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary text-sm">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startEdit} className="btn-secondary text-sm">
                Edit draft
              </button>
              <button type="button" onClick={handleCopy} className="btn-secondary text-sm">
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
              <button type="button" onClick={handleDownloadTxt} className="btn-secondary text-sm">
                .txt
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfLoading}
                className="btn-secondary text-sm"
              >
                {isPdfLoading ? 'PDF…' : 'PDF'}
              </button>
              <button type="button" onClick={handleWhatsApp} className="btn-secondary text-sm">
                WhatsApp
              </button>
              <button type="button" onClick={handleEmail} className="btn-secondary text-sm">
                Email
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || saveSuccess}
                className="btn-secondary text-sm"
              >
                {saveSuccess ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={onRegenerate} className="btn-primary text-sm ml-auto">
                Regenerate
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
