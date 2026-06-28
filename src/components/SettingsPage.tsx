'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import {
  fetchReferralStats,
  getReferralLink,
  revokeAllSessions,
  deleteUserAccount,
  updateProfile,
} from '../lib/userAccount';
import type { Profile } from '../lib/types';
import Navbar from './Navbar';
import TermsContent from './TermsContent';
import PrivacyContent from './PrivacyContent';
import FeedbackModal from './FeedbackModal';
import { Bell, BarChart3, CreditCard, Download, Info, Lock, Sparkles, SunMoon, Users } from 'lucide-react';

const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const DATE_FORMATS = ['DD/MM/YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY'];
const RESPONSE_STYLES = ['Professional', 'Formal legal', 'Detailed', 'Simple'];
const RESPONSE_LENGTHS = ['Short', 'Medium', 'Detailed'];
const EXPORT_FORMATS = ['PDF', 'DOCX'];
const FONT_SIZES = [
  { label: 'Small', value: 'small' as const },
  { label: 'Medium', value: 'medium' as const },
  { label: 'Large', value: 'large' as const },
];
const THEME_OPTIONS = [
  { label: 'System', value: 'system' as const },
  { label: 'Light', value: 'light' as const },
  { label: 'Dark', value: 'dark' as const },
];

export default function SettingsPage() {
  const router = useRouter();
  const {
    session,
    profile,
    subscription,
    theme,
    fontSize,
    isPro,
    accountLoading,
    refreshAccount,
    setThemeMode,
    setFontSizeMode,
  } = useApp();

  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<'bug' | 'feedback' | 'terms' | 'privacy' | 'changeEmail' | 'changePassword' | 'deleteAccount' | null>(null);
  const [bugText, setBugText] = useState('');
  const [showBugSuccess, setShowBugSuccess] = useState(false);

  const handleSendBugReport = () => {
    if (!bugText.trim()) return;
    const mailtoLink = `mailto:abhiksinha1523@gmail.com?subject=Bug%20Report%20-%20Draftee&body=${encodeURIComponent(bugText)}`;
    window.location.href = mailtoLink;
    setShowBugSuccess(true);
    setTimeout(() => {
      setModalContent(null);
      setBugText('');
      setShowBugSuccess(false);
    }, 2000);
  };
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [accountActionSuccess, setAccountActionSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [referralStats, setReferralStats] = useState({ count: 0, rewardsEarned: 0, referralsUntilReward: 5 });
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      profile_photo_url: profile.profile_photo_url,
      language: profile.language || 'English',
      preferred_court_format: profile.preferred_court_format || 'District Court',
      preferred_draft_language: profile.preferred_draft_language || 'English',
      default_jurisdiction: profile.default_jurisdiction || profile.court_jurisdiction || 'Delhi',
      preferred_date_format: profile.preferred_date_format || DATE_FORMATS[0],
      response_style: profile.response_style || RESPONSE_STYLES[0],
      response_length: profile.response_length || RESPONSE_LENGTHS[1],
      default_export_format: profile.default_export_format || EXPORT_FORMATS[0],
      auto_download_drafts: profile.auto_download_drafts ?? false,
      cloud_backup_enabled: profile.cloud_backup_enabled ?? true,
      auto_save_drafts: profile.auto_save_drafts ?? true,
      save_chat_history: profile.save_chat_history ?? true,
      notify_product_updates: profile.notify_product_updates ?? true,
      notify_new_features: profile.notify_new_features ?? true,
      notify_referrals: profile.notify_referrals ?? true,
      promotional_emails: profile.promotional_emails ?? false,
      two_factor_enabled: profile.two_factor_enabled ?? false,
      theme: profile.theme,
      font_size: profile.font_size || fontSize,
    });
  }, [profile, fontSize]);

  useEffect(() => {
    fetchReferralStats().then(setReferralStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (saveMessage) {
      const timer = window.setTimeout(() => setSaveMessage(null), 3000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [saveMessage]);

  const referralLink = useMemo(() => {
    if (!profile?.referral_code) return '';
    return getReferralLink(profile.referral_code);
  }, [profile]);

  const handleFieldChange = (field: keyof Profile, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async (updates: Partial<Profile>) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      ) as Partial<Profile>;
      if (Object.keys(cleanUpdates).length === 0) {
        setSaveMessage('Nothing to save.');
        return;
      }
      await updateProfile(cleanUpdates);
      await refreshAccount();
      setSaveMessage('Settings saved successfully.');
    } catch (err) {
      console.error('Save failed', err);
      setSaveMessage('Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfileSection = async () => {
    await saveSettings({
      full_name: form.full_name || '',
      phone_number: form.phone_number,
      profile_photo_url: form.profile_photo_url,
      language: form.language,
      theme: form.theme,
      font_size: form.font_size,
    });
  };

  const saveDraftPreferences = async () => {
    await saveSettings({
      preferred_court_format: form.preferred_court_format,
      preferred_draft_language: form.preferred_draft_language,
      default_jurisdiction: form.default_jurisdiction,
      preferred_date_format: form.preferred_date_format,
      response_style: form.response_style,
      response_length: form.response_length,
    });
  };

  const saveDocumentPreferences = async () => {
    await saveSettings({
      default_export_format: form.default_export_format,
      auto_download_drafts: form.auto_download_drafts,
      cloud_backup_enabled: form.cloud_backup_enabled,
      auto_save_drafts: form.auto_save_drafts,
      save_chat_history: form.save_chat_history,
    });
  };

  const saveNotifications = async () => {
    await saveSettings({
      notify_product_updates: form.notify_product_updates,
      notify_new_features: form.notify_new_features,
      notify_referrals: form.notify_referrals,
      promotional_emails: form.promotional_emails,
    });
  };

  const handleCopyReferralLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setSaveMessage('Referral link copied to clipboard.');
  };

  const handleExportData = () => {
    if (!profile) return;
    setExportingData(true);
    const data = {
      profile,
      subscription,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'draftee-account-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setExportingData(false);
    setSaveMessage('Account data exported.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleLogoutAllDevices = async () => {
    setAccountActionBusy(true);
    setAccountActionError(null);
    try {
      await revokeAllSessions();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err: any) {
      setAccountActionError(err?.message || 'Unable to sign out all sessions.');
    } finally {
      setAccountActionBusy(false);
    }
  };

  const handleSaveTheme = async (value: 'dark' | 'light' | 'system') => {
    handleFieldChange('theme', value);
    await setThemeMode(value);
    await saveSettings({ theme: value });
  };

  const handleSaveFontSize = async (value: 'small' | 'medium' | 'large') => {
    handleFieldChange('font_size', value);
    await setFontSizeMode(value);
    await saveSettings({ font_size: value });
  };

  const handleAccountAction = async () => {
    const email = session?.user?.email || '';
    if (!email) {
      setAccountActionError('Sign in again before continuing.');
      return;
    }
    setAccountActionBusy(true);
    setAccountActionError(null);
    setAccountActionSuccess(null);

    try {
      if (!currentPassword.trim()) {
        throw new Error('Current password is required.');
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) throw reauthError;

      if (modalContent === 'changeEmail') {
        if (!newEmail.trim()) {
          throw new Error('New email is required.');
        }
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        setAccountActionSuccess('Email updated. Please verify your new email address.');
      }

      if (modalContent === 'changePassword') {
        if (!newPassword.trim()) {
          throw new Error('New password is required.');
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setAccountActionSuccess('Password updated successfully.');
      }

      if (modalContent === 'deleteAccount') {
        await deleteUserAccount();
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setCurrentPassword('');
      setNewEmail('');
      setNewPassword('');
      setModalContent(null);
      await refreshAccount();
    } catch (err: any) {
      console.error(err);
      setAccountActionError(err?.message || 'Action failed. Please try again.');
    } finally {
      setAccountActionBusy(false);
    }
  };

  const planLabel = subscription?.plan === 'pro' ? 'Pro subscriber' : 'Free plan';
  const draftLimit = profile?.user_type === 'individual' ? 2 : 10;
  const usedDrafts = subscription?.drafts_this_month ?? 0;
  const remainingDrafts = Math.max(0, draftLimit - usedDrafts);
  const chatUsage = subscription?.chat_messages_today ?? 0;

  const usageHistory = useMemo(
    () => [
      { label: 'Apr', value: Math.max(1, usedDrafts - 2) },
      { label: 'May', value: Math.max(2, usedDrafts - 1) },
      { label: 'Jun', value: usedDrafts },
      { label: 'Jul', value: Math.min(5, usedDrafts + 1) },
      { label: 'Aug', value: Math.max(1, Math.floor(usedDrafts / 2)) },
    ],
    [usedDrafts]
  );

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl text-cream">Settings</h1>
            <p className="mt-2 text-sm text-cream/60 max-w-2xl">
              Manage your account, billing, draft behavior, AI preferences, security, and referral rewards from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => setModalContent('feedback')}
              className="btn-primary px-4 py-2 text-sm"
            >
              Send feedback
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          <div className="space-y-6">
            <section className="card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-cream/60">Account overview</p>
                  <h2 className="mt-1 font-display text-xl text-gold">Profile & security</h2>
                </div>
                <div className="rounded-3xl border border-border bg-navy/70 px-4 py-2 text-sm text-cream">
                  {planLabel}
                </div>
              </div>

              <div className="grid gap-4 pt-6 md:grid-cols-2">
                <label className="space-y-2 text-sm text-cream">
                  Full name
                  <input
                    value={form.full_name || ''}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    className="input-field"
                    placeholder="Your name"
                  />
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Phone number
                  <input
                    type="tel"
                    value={form.phone_number || ''}
                    onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                    className="input-field"
                    placeholder="+91 98765 43210"
                  />
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Profile photo URL
                  <input
                    value={form.profile_photo_url || ''}
                    onChange={(e) => handleFieldChange('profile_photo_url', e.target.value)}
                    className="input-field"
                    placeholder="Optional image URL"
                  />
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Primary language
                  <select
                    value={form.language || 'English'}
                    onChange={(e) => handleFieldChange('language', e.target.value)}
                    className="input-field"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Hinglish</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-cream/70">
                  <p>Signed in as</p>
                  <p className="font-medium text-cream truncate max-w-full">{session?.user?.email || '—'}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveProfileSection}
                    disabled={saving}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Save profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalContent('changeEmail')}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalContent('changePassword')}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Change password
                  </button>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cream/60">Billing and payment</p>
                  <h2 className="font-display text-xl text-gold">Subscription & invoices</h2>
                </div>
                <CreditCard className="h-5 w-5 text-gold" />
              </div>

              <div className="grid gap-4 pt-6 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-navy/60 p-4">
                  <p className="text-cream/70 text-sm">Plan</p>
                  <p className="mt-2 font-medium text-cream">{subscription?.plan === 'pro' ? 'Pro Annual' : 'Free'}</p>
                  {subscription?.pro_until ? (
                    <p className="text-cream/50 text-sm mt-1">Renewal: {new Date(subscription.pro_until).toLocaleDateString()}</p>
                  ) : null}
                </div>
                <div className="rounded-3xl border border-border bg-navy/60 p-4">
                  <p className="text-cream/70 text-sm">Usage this month</p>
                  <p className="mt-2 font-medium text-cream">{usedDrafts} drafts</p>
                  <p className="text-cream/50 text-sm mt-1">{subscription?.chat_messages_today ?? 0} AI messages</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Link href="/pricing" className="btn-secondary px-4 py-3 text-sm text-center">
                  Manage plan
                </Link>
                <button type="button" onClick={handleExportData} className="btn-secondary px-4 py-3 text-sm">
                  <Download className="inline h-4 w-4 mr-2 align-text-bottom" /> Export data
                </button>
                <button type="button" onClick={() => router.push('/pricing')} className="btn-primary px-4 py-3 text-sm">
                  {subscription?.plan === 'pro' ? 'Upgrade plan' : 'Upgrade to Pro'}
                </button>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cream/60">Draft generation</p>
                  <h2 className="font-display text-xl text-gold">Draft preferences</h2>
                </div>
                <Sparkles className="h-5 w-5 text-gold" />
              </div>

              <div className="grid gap-4 pt-6 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-cream">
                  Court format
                  <select
                    value={form.preferred_court_format || 'District Court'}
                    onChange={(e) => handleFieldChange('preferred_court_format', e.target.value)}
                    className="input-field"
                  >
                    <option>District Court</option>
                    <option>High Court</option>
                    <option>Supreme Court</option>
                    <option>Commercial Court</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Draft language
                  <select
                    value={form.preferred_draft_language || 'English'}
                    onChange={(e) => handleFieldChange('preferred_draft_language', e.target.value)}
                    className="input-field"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Default jurisdiction
                  <select
                    value={form.default_jurisdiction || 'Delhi'}
                    onChange={(e) => handleFieldChange('default_jurisdiction', e.target.value)}
                    className="input-field"
                  >
                    {STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Date format
                  <select
                    value={form.preferred_date_format || DATE_FORMATS[0]}
                    onChange={(e) => handleFieldChange('preferred_date_format', e.target.value)}
                    className="input-field"
                  >
                    {DATE_FORMATS.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-navy/60 px-4 py-3 text-sm text-cream">
                  Default auto-save drafts
                  <input
                    type="checkbox"
                    checked={form.auto_save_drafts ?? true}
                    onChange={(e) => handleFieldChange('auto_save_drafts', e.target.checked)}
                    className="h-5 w-5 rounded border-border bg-navy/20 text-gold"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-navy/60 px-4 py-3 text-sm text-cream">
                  Keep draft history
                  <input
                    type="checkbox"
                    checked={form.save_chat_history ?? true}
                    onChange={(e) => handleFieldChange('save_chat_history', e.target.checked)}
                    className="h-5 w-5 rounded border-border bg-navy/20 text-gold"
                  />
                </label>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={saveDraftPreferences} className="btn-primary px-4 py-3 text-sm" disabled={saving}>
                  Save draft preferences
                </button>
                {saveMessage ? <p className="text-sm text-emerald-300">{saveMessage}</p> : null}
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cream/60">Document workflow</p>
                  <h2 className="font-display text-xl text-gold">Document settings</h2>
                </div>
                <Download className="h-5 w-5 text-gold" />
              </div>

              <div className="grid gap-4 pt-6 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-cream">
                  Default export format
                  <select
                    value={form.default_export_format || 'PDF'}
                    onChange={(e) => handleFieldChange('default_export_format', e.target.value)}
                    className="input-field"
                  >
                    {EXPORT_FORMATS.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Auto-download drafts
                  <input
                    type="checkbox"
                    checked={form.auto_download_drafts ?? false}
                    onChange={(e) => handleFieldChange('auto_download_drafts', e.target.checked)}
                    className="h-5 w-5 rounded border-border bg-navy/20 text-gold"
                  />
                </label>
                <label className="space-y-2 text-sm text-cream col-span-2">
                  Cloud backup
                  <input
                    type="checkbox"
                    checked={form.cloud_backup_enabled ?? true}
                    onChange={(e) => handleFieldChange('cloud_backup_enabled', e.target.checked)}
                    className="h-5 w-5 rounded border-border bg-navy/20 text-gold"
                  />
                </label>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={saveDocumentPreferences} className="btn-primary px-4 py-3 text-sm" disabled={saving}>
                  Save document settings
                </button>
                <p className="text-sm text-cream/60">These preferences are applied to drafts and exports.</p>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cream/60">Notifications</p>
                  <h2 className="font-display text-xl text-gold">Alerts & privacy</h2>
                </div>
                <Bell className="h-5 w-5 text-gold" />
              </div>

              <div className="grid gap-3 pt-6">
                {[
                  { label: 'Product updates', key: 'notify_product_updates' as const },
                  { label: 'New feature announcements', key: 'notify_new_features' as const },
                  { label: 'Referral activity', key: 'notify_referrals' as const },
                  { label: 'Promotional emails', key: 'promotional_emails' as const },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-navy/60 px-4 py-3 text-sm text-cream">
                    {item.label}
                    <input
                      type="checkbox"
                      checked={Boolean(form[item.key])}
                      onChange={(e) => handleFieldChange(item.key, e.target.checked)}
                      className="h-5 w-5 rounded border-border bg-navy/20 text-gold"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={saveNotifications} className="btn-primary px-4 py-3 text-sm" disabled={saving}>
                  Save notification settings
                </button>
                <p className="text-sm text-cream/60">Notifications are persisted to your account.</p>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-cream/60">Security</p>
                  <h2 className="font-display text-xl text-gold">Privacy controls</h2>
                </div>
                <Lock className="h-5 w-5 text-gold" />
              </div>

              <div className="grid gap-3 pt-6 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-navy/60 px-4 py-3 text-sm text-cream">
                  Two-factor authentication
                  <input
                    type="checkbox"
                    checked={form.two_factor_enabled ?? false}
                    onChange={(e) => handleFieldChange('two_factor_enabled', e.target.checked)}
                    className="h-5 w-5 rounded border-border bg-navy/20 text-gold"
                  />
                </label>
                <div className="rounded-3xl border border-border bg-navy/60 p-4 text-sm text-cream/70">
                  <p className="font-medium text-cream">Sign out across devices</p>
                  <p className="mt-1">Revoke all active sessions and protect your account.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={handleLogoutAllDevices} className="btn-secondary px-4 py-3 text-sm" disabled={accountActionBusy}>
                  {accountActionBusy ? 'Revoking sessions...' : 'Sign out all devices'}
                </button>
                <button type="button" onClick={() => setModalContent('deleteAccount')} className="btn-danger px-4 py-3 text-sm">
                  Delete account
                </button>
              </div>
              {accountActionError ? <p className="mt-3 text-sm text-rose-300">{accountActionError}</p> : null}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="card border border-border bg-navy/80 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-cream/60">Referral & rewards</p>
                  <h3 className="mt-1 font-display text-xl text-gold">Invite colleagues</h3>
                </div>
                <Users className="h-5 w-5 text-gold" />
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-border bg-navy/60 p-4 text-sm text-cream">
                  <p className="font-medium text-cream">{referralStats.count} successful referrals</p>
                  <p className="text-cream/50">{referralStats.rewardsEarned} rewards earned</p>
                </div>
                <div className="rounded-3xl border border-border bg-navy/60 p-4 text-sm text-cream">
                  <p className="text-cream/60">Next reward in</p>
                  <p className="mt-1 font-medium text-cream">{referralStats.referralsUntilReward} referrals</p>
                </div>
                {referralLink ? (
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-border bg-navy/60 p-3 text-sm text-cream break-all">{referralLink}</div>
                    <button type="button" onClick={handleCopyReferralLink} className="btn-secondary w-full px-4 py-3 text-sm">
                      Copy referral link
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card border border-border bg-navy/80 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-cream/60">App personalization</p>
                  <h3 className="mt-1 font-display text-xl text-gold">Appearance & accessibility</h3>
                </div>
                <SunMoon className="h-5 w-5 text-gold" />
              </div>
              <div className="grid gap-4 pt-6">
                <label className="space-y-2 text-sm text-cream">
                  Theme
                  <select
                    value={theme}
                    onChange={(e) => handleSaveTheme(e.target.value as 'dark' | 'light' | 'system')}
                    className="input-field"
                  >
                    {THEME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-cream">
                  Font size
                  <select
                    value={fontSize}
                    onChange={(e) => handleSaveFontSize(e.target.value as 'small' | 'medium' | 'large')}
                    className="input-field"
                  >
                    {FONT_SIZES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="card border border-border bg-navy/80 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-cream/60">Usage analytics</p>
                  <h3 className="mt-1 font-display text-xl text-gold">Performance summary</h3>
                </div>
                <BarChart3 className="h-5 w-5 text-gold" />
              </div>
              <div className="mt-6 space-y-4 text-sm text-cream">
                <div className="rounded-3xl border border-border bg-navy/60 p-4">
                  <p className="text-cream/60">Drafts this month</p>
                  <p className="mt-2 font-medium text-cream">{usedDrafts}</p>
                </div>
                <div className="rounded-3xl border border-border bg-navy/60 p-4">
                  <p className="text-cream/60">Remaining free drafts</p>
                  <p className="mt-2 font-medium text-cream">{remainingDrafts}</p>
                </div>
                <div className="rounded-3xl border border-border bg-navy/60 p-4">
                  <p className="text-cream/60">Daily chat allowance</p>
                  <p className="mt-2 font-medium text-cream">{isPro ? 'Unlimited' : `5 max (used ${chatUsage})`}</p>
                </div>
              </div>
            </div>

            <div className="card border border-border bg-navy/80 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-cream/60">Help center</p>
                  <h3 className="mt-1 font-display text-xl text-gold">Support & resources</h3>
                </div>
                <Info className="h-5 w-5 text-gold" />
              </div>
              <div className="mt-6 grid gap-3">
                <Link href="/help" className="btn-secondary px-4 py-3 text-sm text-center">
                  Open help center
                </Link>
                <button type="button" onClick={() => setModalContent('privacy')} className="btn-secondary px-4 py-3 text-sm">
                  Privacy policy
                </button>
                <button type="button" onClick={() => setModalContent('terms')} className="btn-secondary px-4 py-3 text-sm">
                  Terms of use
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {modalContent === 'bug' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="font-display text-xl text-gold">Report a Bug</h2>
              <button
                onClick={() => setModalContent(null)}
                className="p-2 -mr-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {showBugSuccess ? (
                <div className="py-12 text-center text-gold animate-in fade-in">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-display text-xl">Thank you!</p>
                  <p className="text-cream/70 mt-2">Your report has been submitted.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-cream/90 text-sm font-medium mb-2">
                      What happened?
                    </label>
                    <textarea
                      value={bugText}
                      onChange={(e) => setBugText(e.target.value.slice(0, 2000))}
                      placeholder="Tell us about the issue you encountered"
                      className="w-full bg-navy/50 border border-border rounded-xl p-3 text-cream placeholder:text-cream/30 focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all min-h-[160px] resize-y"
                    />
                    <div className="text-right text-xs text-cream/40 mt-1">
                      {bugText.length} / 2000
                    </div>
                  </div>
                  <p className="text-xs text-cream/50 leading-relaxed">
                    Any information you share may be reviewed to help improve Draftee. If you have additional questions, <a href="mailto:abhiksinha1523@gmail.com" className="text-gold hover:underline">contact support</a>.
                  </p>
                  <button
                    onClick={handleSendBugReport}
                    disabled={!bugText.trim()}
                    className="btn-primary w-full py-3 text-base mt-2"
                  >
                    Send
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalContent === 'changeEmail' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-display text-xl text-gold">Change email</h2>
                <p className="text-sm text-cream/60">Reauthenticate to update your email address.</p>
              </div>
              <button
                onClick={() => setModalContent(null)}
                className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm text-cream">
                New email address
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field w-full"
                />
              </label>
              <label className="block text-sm text-cream">
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field w-full"
                />
              </label>
              {accountActionError ? <p className="text-sm text-rose-300">{accountActionError}</p> : null}
              {accountActionSuccess ? <p className="text-sm text-emerald-300">{accountActionSuccess}</p> : null}
              <button
                type="button"
                onClick={handleAccountAction}
                disabled={accountActionBusy}
                className="btn-primary w-full py-3"
              >
                {accountActionBusy ? 'Updating…' : 'Update email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalContent === 'changePassword' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-display text-xl text-gold">Change password</h2>
                <p className="text-sm text-cream/60">Update your password securely.</p>
              </div>
              <button
                onClick={() => setModalContent(null)}
                className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm text-cream">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field w-full"
                />
              </label>
              <label className="block text-sm text-cream">
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field w-full"
                />
              </label>
              {accountActionError ? <p className="text-sm text-rose-300">{accountActionError}</p> : null}
              {accountActionSuccess ? <p className="text-sm text-emerald-300">{accountActionSuccess}</p> : null}
              <button
                type="button"
                onClick={handleAccountAction}
                disabled={accountActionBusy}
                className="btn-primary w-full py-3"
              >
                {accountActionBusy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalContent === 'deleteAccount' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-display text-xl text-gold">Delete account</h2>
                <p className="text-sm text-cream/60">This action is permanent. Your profile and subscription data will be removed.</p>
              </div>
              <button
                onClick={() => setModalContent(null)}
                className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm text-cream">
                Confirm current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field w-full"
                />
              </label>
              {accountActionError ? <p className="text-sm text-rose-300">{accountActionError}</p> : null}
              <button
                type="button"
                onClick={handleAccountAction}
                disabled={accountActionBusy}
                className="btn-danger w-full py-3"
              >
                {accountActionBusy ? 'Deleting account…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(modalContent === 'terms' || modalContent === 'privacy') && (
        <div className="fixed inset-0 z-[100] bg-navy flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <h2 className="font-display text-xl text-gold">
              {modalContent === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
            </h2>
            <button
              onClick={() => setModalContent(null)}
              className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-3xl mx-auto bg-card rounded-xl border border-border p-6 sm:p-8">
              {modalContent === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </div>
        </div>
      )}

      {modalContent === 'feedback' && <FeedbackModal onClose={() => setModalContent(null)} />}
    </div>
  );
}
