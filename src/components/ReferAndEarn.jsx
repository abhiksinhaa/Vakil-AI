import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { fetchReferralStats } from '../lib/userAccount';

export default function ReferAndEarn() {
  const { session } = useApp();
  const [stats, setStats] = useState({ count: 0, rewardsEarned: 0, referralsUntilReward: 5 });
  const [referralLink, setReferralLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!session?.user) return;
      try {
        setReferralLink(`draftee.in/signup?ref=${session.user.id.substring(0, 8)}`);
        const data = await fetchReferralStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load referral stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [session]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!referralLink) return;
    const message = `Hey! I've been using Draftee - an AI tool that generates legal drafts in seconds. Really useful for lawyers. Sign up free here: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/settings"
            className="p-2 -ml-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
            aria-label="Back to settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-gold">Refer & Earn 🎁</h1>
        </div>

        <section className="card space-y-4 mb-6 border-gold/30 bg-gradient-to-br from-navy to-gold/5">
          <p className="text-lg text-cream font-medium">
            Refer 5 friends who sign up — get 2 months Premium free
          </p>
          <p className="text-sm text-cream/60">
            Premium at ₹99/month. Your referrals are being tracked now.
          </p>
        </section>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="card text-center py-6 border-gold/10 hover:border-gold/30 transition-colors">
                <p className="font-display text-3xl text-gold mb-1">{stats.count}</p>
                <p className="text-sm text-cream/70">Referrals</p>
              </div>
              <div className="card text-center py-6 border-gold/10 hover:border-gold/30 transition-colors">
                <p className="font-display text-3xl text-gold mb-1">{stats.rewardsEarned}</p>
                <p className="text-sm text-cream/70">Premium months earned</p>
              </div>
              <div className="card text-center py-6 border-gold/10 hover:border-gold/30 transition-colors">
                <p className="font-display text-3xl text-gold mb-1">{stats.referralsUntilReward}</p>
                <p className="text-sm text-cream/70">Until next reward</p>
              </div>
            </div>

            <section className="card space-y-6">
              <h2 className="font-display text-lg text-gold">Your Referral Link</h2>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-navy/50 border border-border rounded-xl px-4 py-3 flex items-center overflow-hidden">
                  <span className="text-cream/90 truncate text-sm">
                    {referralLink || 'Loading link...'}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  disabled={!referralLink}
                  className="btn-secondary whitespace-nowrap min-w-[120px]"
                >
                  {copied ? 'Copied! ✓' : 'Copy Link'}
                </button>
              </div>

              <button
                onClick={handleWhatsAppShare}
                disabled={!referralLink}
                className="w-full px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/20 hover:border-[#25D366]/50 transition-colors text-[#25D366] font-medium flex justify-center items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.347-.272.271-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                Share on WhatsApp
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
