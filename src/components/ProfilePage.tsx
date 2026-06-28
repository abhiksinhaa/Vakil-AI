'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { fetchReferralStats, isAdvocateProfileComplete, updateProfile } from '../lib/userAccount';

export default function ProfilePage() {
  const { profile, session } = useApp();
  const [form, setForm] = useState({
    full_name: '',
    advocate_name: '',
    bar_council_number: '',
    court_jurisdiction: '',
    state: '',
    city: '',
    pincode: '',
  });
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState<{ count: number; rewardsEarned: number; referralsUntilReward: number } | null>(null);

  const isIndividual = profile?.user_type !== 'advocate';
  const needsAdvocateFields = !isIndividual;

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
    const fetchProfile = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Profile page auth failed', authError);
        return;
      }
      const user = authData?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile load failed', error);
        return;
      }

      if (data) {
        setForm({
          full_name: data.full_name || '',
          advocate_name: data.advocate_name || '',
          bar_council_number: data.bar_council_number || '',
          court_jurisdiction: data.court_jurisdiction || '',
          state: data.state || '',
          city: data.city || '',
          pincode: data.pincode || '',
        });
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchReferralStats()
      .then(setReferralStats)
      .catch((err) => console.error('Referral stats load failed', err));
  }, [session?.user?.id]);

  const referralSource = profile?.referral_code || session?.user?.id?.substring(0, 8) || '';
  const referralLink = referralSource ? `https://draftee.in/signup?ref=${referralSource}` : '';

  const handleSave = async () => {
    if (!session?.user?.id) {
      setMessage('Please log in first.');
      return;
    }

    try {
      await updateProfile({
        full_name: form.full_name,
        advocate_name: form.advocate_name,
        bar_council_number: form.bar_council_number,
        court_jurisdiction: form.court_jurisdiction,
        state: form.state,
        city: form.city,
        pincode: form.pincode,
      });

      setMessage('Profile saved successfully.');
    } catch (err: any) {
      console.error('Profile save failed', err);
      setMessage(`Error saving profile: ${err?.message || 'Unknown error'}`);
    }
  };

  const copyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed', err);
    }
  };

  const handleWhatsAppShare = () => {
    if (!referralLink) return;
    const text = `Hey! I've been using Draftee - an AI tool that generates legal drafts in seconds. Sign up free here: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const advocateIncomplete = needsAdvocateFields && !isAdvocateProfileComplete(form);

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <section className="mb-8">
          <h1 className="font-display text-3xl text-gold mb-2">Profile</h1>
          <p className="text-cream/70 text-sm">
            Edit your profile and save manually. Advocate fields are optional but recommended for better drafts.
          </p>
        </section>

        {advocateIncomplete && (
          <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm text-cream/90">
            Complete advocate name, Bar Council number, and court/jurisdiction for improved draft output.
          </div>
        )}

        <section className="card space-y-6 mb-8 p-6 bg-[#03111f] border border-[#445b7f] rounded-3xl">
          <div>
            <h2 className="font-display text-xl text-gold mb-4">
              {isIndividual ? 'User Profile' : 'Advocate Profile'}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-cream/80">
                <span>Full name</span>
                <input
                  className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                  placeholder="Your name"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </label>

              {needsAdvocateFields ? (
                <label className="space-y-2 text-sm text-cream/80 md:col-span-2">
                  <span>Advocate name</span>
                  <input
                    className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                    placeholder="Adv. Rajesh Kumar"
                    value={form.advocate_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, advocate_name: e.target.value }))}
                  />
                </label>
              ) : (
                <label className="space-y-2 text-sm text-cream/80 md:col-span-2">
                  <span>Display name</span>
                  <input
                    className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                    placeholder="Your display name"
                    value={form.advocate_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, advocate_name: e.target.value }))}
                  />
                </label>
              )}

              {needsAdvocateFields ? (
                <>
                  <label className="space-y-2 text-sm text-cream/80">
                    <span>Bar Council number</span>
                    <input
                      className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                      placeholder="D/1234/2015"
                      value={form.bar_council_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, bar_council_number: e.target.value }))}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-cream/80">
                    <span>Court / jurisdiction</span>
                    <input
                      className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                      placeholder="Delhi District Court"
                      value={form.court_jurisdiction}
                      onChange={(e) => setForm((prev) => ({ ...prev, court_jurisdiction: e.target.value }))}
                    />
                  </label>
                </>
              ) : null}

              <label className="space-y-2 text-sm text-cream/80">
                <span>State</span>
                <input
                  className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </label>

              <label className="space-y-2 text-sm text-cream/80">
                <span>City</span>
                <input
                  className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </label>

              <label className="space-y-2 text-sm text-cream/80">
                <span>PIN code</span>
                <input
                  className="w-full rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-white placeholder:text-cream/40"
                  placeholder="400001"
                  value={form.pincode}
                  onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
                />
              </label>
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border px-4 py-3 text-sm text-cream/90 bg-[#091823] border-[#4f6c8a]">
              {message}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#ffd166]"
          >
            Save Profile
          </button>
        </section>

        <section className="card p-6 rounded-3xl border border-[#4f6c8a] bg-[#03111f]">
          <h2 className="font-display text-xl text-gold mb-3">Referral Program</h2>
          <p className="text-cream/70 text-sm mb-6">
            Refer 5 friends who sign up and get 2 months of Premium free.
          </p>

          {referralStats ? (
            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              <div className="rounded-2xl border border-[#1f3a5a] bg-[#071828] p-4 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.count}</p>
                <p className="text-xs text-cream/50">Referrals</p>
              </div>
              <div className="rounded-2xl border border-[#1f3a5a] bg-[#071828] p-4 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.rewardsEarned}</p>
                <p className="text-xs text-cream/50">Premium months</p>
              </div>
              <div className="rounded-2xl border border-[#1f3a5a] bg-[#071828] p-4 text-center">
                <p className="text-2xl font-display text-gold">{referralStats.referralsUntilReward}</p>
                <p className="text-xs text-cream/50">Until next reward</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-cream/70">Referral link</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 rounded-2xl border border-[#4f6c8a] bg-[#071828] px-4 py-3 text-sm text-cream"
                />
                <button
                  type="button"
                  onClick={copyReferral}
                  className="rounded-2xl bg-[#193d2e] px-4 py-3 text-sm font-semibold text-gold"
                >
                  {copied ? 'Copied ✓' : 'Copy link'}
                </button>
              </div>
              <p className="text-xs text-cream/50">Code: <span className="text-gold">{referralSource}</span></p>
            </div>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={!referralLink}
              className="w-full rounded-2xl border border-[#25d366]/30 bg-[#072c1f] px-4 py-3 text-sm font-semibold text-[#25d366] transition hover:bg-[#123f2c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Share on WhatsApp
            </button>
          </div>
        </section>

        <p className="text-center mt-8 text-sm text-cream/70">
          <Link href="/pricing" className="text-gold hover:underline">
            View plans & upgrade →
          </Link>
        </p>
      </main>
    </div>
  );
}
