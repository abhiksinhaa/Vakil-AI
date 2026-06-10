import { useState } from 'react';
import { submitFeedback } from '../lib/userAccount';

export default function FeedbackModal({ onClose }) {
  const [type, setType] = useState('Bug Report 🐛');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  const feedbackTypes = [
    'Bug Report 🐛',
    'Feature Request ✨',
    'General Feedback 💬',
    'Draft Quality Issue ⚖️',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({ type, subject, description, rating });
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-navy flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h2 className="font-display text-xl text-gold">Share Your Feedback</h2>
          <p className="text-cream/50 text-sm">Help us improve Draftee</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border p-6 sm:p-8">
          {showSuccess ? (
            <div className="py-12 text-center text-gold animate-in fade-in">
              <svg className="w-16 h-16 mx-auto mb-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-display text-2xl mb-2">Thank you!</p>
              <p className="text-cream/70 text-lg">Your feedback helps us build a better Draftee.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-cream/90 text-sm font-medium mb-2">
                  Feedback Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-navy/50 border border-border rounded-xl p-3 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23fef6e4' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                >
                  {feedbackTypes.map(ft => (
                    <option key={ft} value={ft} className="bg-navy">{ft}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cream/90 text-sm font-medium mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your feedback"
                  className="w-full bg-navy/50 border border-border rounded-xl p-3 text-cream placeholder:text-cream/30 focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-cream/90 text-sm font-medium mb-2">
                  Detailed Feedback *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="Tell us in detail — what happened, what you expected, what would help you..."
                  rows={4}
                  className="w-full bg-navy/50 border border-border rounded-xl p-3 text-cream placeholder:text-cream/30 focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all resize-y min-h-[120px]"
                />
                <div className="text-right text-xs text-cream/40 mt-2">
                  {description.length} / 2000
                </div>
              </div>

              <div>
                <label className="block text-cream/90 text-sm font-medium mb-2">
                  Overall experience with Draftee
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-2 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <svg
                        className={`w-8 h-8 ${rating >= star ? 'text-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' : 'text-cream/20'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="btn-primary w-full py-4 text-lg font-medium shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,215,0,0.5)] disabled:shadow-none transition-all duration-300"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
