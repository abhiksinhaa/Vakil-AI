'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Navbar from './Navbar';
import { auth, db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { fetchReferralStats, isAdvocateProfileComplete } from '../lib/userAccount';

export default function ProfilePage() {
  const { profile, refreshAccount, session } = useApp();
  const [form, setForm] = useState({
    full_name: '',
    advocate_name: '',
    bar_council_number: '',
    court_jurisdiction: '',
    state: '',
    city: '',
    pincode: '',
  });
  const [referralStats, setReferralStats] = useState(null);
  const [userIdRef, setUserIdRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Profile page mounted');
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        advocate_name: profile.advocate_name || '',
        bar_council_number: profile.bar_council_number || '',
        court_jurisdiction: profile.court_jurisdiction || '',
        state: profile.state || '',
        city: profile.city || '',
        pincode: profile.pincode || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const loadSavedProfile = async () => {
      try {
        const profileSnap = await getDoc(doc(db, 'users', session.user.id));
        if (!profileSnap.exists()) return;
        const data = profileSnap.data();
        setForm({
          full_name: data.full_name || '',
          advocate_name: data.advocate_name || '',
          bar_council_number: data.bar_council_number || '',
          court_jurisdiction: data.court_jurisdiction || '',
          state: data.state || '',
          city: data.city || '',
          pincode: data.pincode || '',
        });
      } catch (err) {
        console.error('Failed to load saved profile:', err);
      }
    };

    loadSavedProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) setUserIdRef(session.user.id.substring(0, 8));
    fetchReferralStats().then(setReferralStats).catch(console.error);
  }, [session]);

  const referralLink = userIdRef
    ? `https://draftee.in/signup?ref=${userIdRef}`
    : '';

  const handleSave = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    console.log('Manual save triggered');

    const user = auth.currentUser;
    if (!user) {
      setError('Not signed in. Please sign in and try again.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const profileData = {
        full_name: form.full_name,
        advocate_name: form.advocate_name,
        bar_council_number: form.bar_council_number,
        court_jurisdiction: form.court_jurisdiction,
        state: form.state,
        city: form.city,
        pincode: form.pincode,
      };
      console.log('Saving profile to Firestore...', { uid: user.uid, profileData });
      await setDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Profile save failed:', err);
      setError(err?.message || 'Save failed');
      try { window.alert('Profile save failed: ' + (err?.message || 'Unknown error')); } catch {}
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

  const handleWhatsAppShare = () => {
    if (!referralLink) return;
    const message = `Hey! I've been using Draftee - an AI tool that generates legal drafts in seconds. Really useful for lawyers. Sign up free here: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const isIndividual = profile?.user_type !== 'advocate';
  const complete = isIndividual ? true : isAdvocateProfileComplete(form);

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl sm:text-3xl text-gold mb-2">Profile & Settings</h1>
        <p className="text-cream/60 text-sm mb-8">
          Advocate details auto-fill on every draft. Refer friends for free Premium months.
        </p>

        {!complete && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-cream/90 text-sm">
            Complete advocate name, Bar Council number, and court/jurisdiction to generate
            drafts.
          </div>
        )}

        <form onSubmit={handleSave} className="card space-y-4 mb-8">
          <h2 className="font-display text-lg text-gold">
            {isIndividual ? 'User Profile' : 'Advocate Profile'}
          </h2>
          <div>
            <label htmlFor="full_name">{isIndividual ? 'User Name' : 'Display Name'} <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          
          {isIndividual ? (
            <>
              <div>
                <label htmlFor="state">State <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                <input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="e.g. Maharashtra"
                />
              </div>
              <div>
                <label htmlFor="city">City <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                <input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div>
                <label htmlFor="pincode">PIN Code <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                <input
                  id="pincode"
                  value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                  placeholder="e.g. 400001"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="advocate_name">Advocate Name (on drafts) <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                <input
                  id="advocate_name"
                  value={form.advocate_name}
                  onChange={(e) => setForm((f) => ({ ...f, advocate_name: e.target.value }))}
                  placeholder="Adv. Rajesh Kumar"
                />
              </div>
              <div>
                <label htmlFor="bar_council_number">Bar Council Number <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                <input
                  id="bar_council_number"
                  value={form.bar_council_number}
                  onChange={(e) => setForm((f) => ({ ...f, bar_council_number: e.target.value }))}
                  placeholder="D/1234/2015"
                />
              </div>
              <div>
                <label htmlFor="court_jurisdiction">City / Court / Jurisdiction <span className="text-sm font-sans text-cream/50">(Optional)</span></label>
                <input
                  id="court_jurisdiction"
                  value={form.court_jurisdiction}
                  onChange={(e) => setForm((f) => ({ ...f, court_jurisdiction: e.target.value }))}
                  placeholder="Delhi District Court"
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {saved && !saving && (
            <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
              Profile saved!
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Profile'}
          </button>
        </form>

        <section className="card space-y-4">
          <h2 className="font-display text-lg text-gold">Referral Program</h2>
          <p className="text-cream/70 text-sm">
            Refer <strong className="text-gold">5 friends</strong> who sign up — get{' '}
            <strong className="text-gold">2 months Premium free</strong>
          </p>

          {referralStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-navy/50 border border-border p-3 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.count}</p>
                <p className="text-xs text-cream/50">Referrals</p>
              </div>
              <div className="rounded-lg bg-navy/50 border border-border p-3 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.rewardsEarned}</p>
                <p className="text-xs text-cream/50">Premium months earned</p>
              </div>
              <div className="rounded-lg bg-navy/50 border border-border p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-2xl font-display text-gold">
                  {referralStats.referralsUntilReward}
                </p>
                <p className="text-xs text-cream/50">Until next reward</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label>Your referral link</label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <input readOnly value={referralLink} className="text-xs sm:text-sm flex-1 bg-navy/50 border border-border rounded-xl px-4 py-3" />
                <button type="button" onClick={copyReferral} className="btn-secondary shrink-0 min-w-[120px]">
                  {copied ? 'Copied ✓' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-cream/40 mt-2">
                Code: <span className="text-gold font-mono">{userIdRef}</span>
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={!referralLink}
              className="w-full px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/20 hover:border-[#25D366]/50 transition-colors text-[#25D366] font-medium flex justify-center items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.347-.272.271-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Share on WhatsApp
            </button>
          </div>
        </section>

        <p className="text-center mt-8">
          <Link href="/pricing" className="text-gold hover:underline text-sm">
            View plans & upgrade →
          </Link>
        </p>
      </div>
    </div>
  );
}
