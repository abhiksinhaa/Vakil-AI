'use client';

import type { Dispatch, SetStateAction } from 'react';

interface FeedbackPopupProps {
  visible: boolean;
  rating: number;
  comment: string;
  loading: boolean;
  success: boolean;
  draftType: string;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => Promise<void>;
  onSkip: () => void;
}

export default function FeedbackPopup({
  visible,
  rating,
  comment,
  loading,
  success,
  draftType,
  onRatingChange,
  onCommentChange,
  onSubmit,
  onSkip,
}: FeedbackPopupProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onSkip}
        aria-hidden="true"
      />
      
      {/* Popup */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[140] p-4 pb-8 transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!visible}
      >
        <div className="mx-auto max-w-lg overflow-hidden rounded-[28px] border border-gold/30 bg-[#08121f]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-gold/80">Feedback</p>
              <h3 className="mt-1 text-2xl font-semibold text-cream">How was your experience? ⭐</h3>
              <p className="text-sm text-cream/70">Rate the draft quality</p>
            </div>

            <div className="flex items-center gap-2">
              {stars.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onRatingChange(value)}
                  className={`rounded-full p-3 transition ${
                    rating >= value ? 'bg-gold text-navy' : 'bg-white/5 text-cream/70 hover:bg-white/10 border border-white/10'
                  }`}
                  aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm text-cream/80">Any suggestions? (optional)</label>
              <textarea
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder="Tell us how we can improve..."
                className="mt-2 min-h-[120px] w-full resize-none rounded-3xl border border-white/10 bg-[#06111a] px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-gold/70 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            {success ? (
              <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
                Thank you for your feedback! 🙏
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onSubmit}
                disabled={loading || rating === 0}
                className="inline-flex w-full items-center justify-center rounded-3xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#ffd966] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Submitting…' : 'Submit Feedback'}
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-center text-sm text-cream/70 transition hover:text-cream"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

