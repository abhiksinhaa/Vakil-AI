import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import {
  fetchReferralStats,
  getReferralLink,
  isAdvocateProfileComplete,
  updateProfile,
} from '../lib/userAccount';

export default function ProfilePage() {
  const { profile, refreshAccount } = useApp();
  const [form, setForm] = useState({
    full_name: '',
    advocate_name: '',
    bar_council_number: '',
    court_jurisdiction: '',
  });
  const [referralStats, setReferralStats] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        advocate_name: profile.advocate_name || '',
        bar_council_number: profile.bar_council_number || '',
        court_jurisdiction: profile.court_jurisdiction || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    fetchReferralStats().then(setReferralStats).catch(console.error);
  }, []);

  const referralLink = profile?.referral_code
    ? getReferralLink(profile.referral_code)
    : '';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(form);
      await refreshAccount();
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const complete = isAdvocateProfileComplete(form);

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl sm:text-3xl text-gold mb-2">Profile & Settings</h1>
        <p className="text-cream/60 text-sm mb-8">
          Advocate details auto-fill on every draft. Refer friends for free Pro months.
        </p>

        {!complete && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-cream/90 text-sm">
            Complete advocate name, Bar Council number, and court/jurisdiction to generate
            drafts.
          </div>
        )}

        <form onSubmit={handleSave} className="card space-y-4 mb-8">
          <h2 className="font-display text-lg text-gold">Advocate Profile</h2>
          <div>
            <label htmlFor="full_name">Display Name</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="advocate_name">Advocate Name (on drafts)</label>
            <input
              id="advocate_name"
              value={form.advocate_name}
              onChange={(e) => setForm((f) => ({ ...f, advocate_name: e.target.value }))}
              placeholder="Adv. Rajesh Kumar"
              required
            />
          </div>
          <div>
            <label htmlFor="bar_council_number">Bar Council Number</label>
            <input
              id="bar_council_number"
              value={form.bar_council_number}
              onChange={(e) => setForm((f) => ({ ...f, bar_council_number: e.target.value }))}
              placeholder="D/1234/2015"
              required
            />
          </div>
          <div>
            <label htmlFor="court_jurisdiction">City / Court / Jurisdiction</label>
            <input
              id="court_jurisdiction"
              value={form.court_jurisdiction}
              onChange={(e) => setForm((f) => ({ ...f, court_jurisdiction: e.target.value }))}
              placeholder="Delhi District Court"
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Profile'}
          </button>
        </form>

        <section className="card space-y-4">
          <h2 className="font-display text-lg text-gold">Referral Program</h2>
          <p className="text-cream/70 text-sm">
            Refer <strong className="text-gold">2 friends</strong> who sign up — get{' '}
            <strong className="text-gold">1 month Pro free</strong>
          </p>

          {referralStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-navy/50 border border-border p-3 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.count}</p>
                <p className="text-xs text-cream/50">Referrals</p>
              </div>
              <div className="rounded-lg bg-navy/50 border border-border p-3 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.rewardsEarned}</p>
                <p className="text-xs text-cream/50">Pro months earned</p>
              </div>
              <div className="rounded-lg bg-navy/50 border border-border p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-2xl font-display text-gold">
                  {referralStats.referralsUntilReward}
                </p>
                <p className="text-xs text-cream/50">Until next reward</p>
              </div>
            </div>
          )}

          <div>
            <label>Your referral link</label>
            <div className="flex gap-2 mt-1">
              <input readOnly value={referralLink} className="text-xs sm:text-sm" />
              <button type="button" onClick={copyReferral} className="btn-secondary shrink-0 text-sm">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-cream/40 mt-2">
              Code: <span className="text-gold font-mono">{profile?.referral_code}</span>
            </p>
          </div>
        </section>

        <p className="text-center mt-8">
          <Link to="/pricing" className="text-gold hover:underline text-sm">
            View plans & upgrade →
          </Link>
        </p>
      </div>
    </div>
  );
}
