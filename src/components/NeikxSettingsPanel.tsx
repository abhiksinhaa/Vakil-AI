'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  Info,
  ShieldCheck,
  Sparkles,
  Star,
  Music2,
  Mic2,
  RefreshCcw,
  Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { updateProfile } from '../lib/userAccount';
import type { Profile } from '../lib/types';

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Hinglish'];
const RESPONSE_STYLE_OPTIONS = ['Balanced', 'Concise', 'Detailed', 'Formal'];
const RESPONSE_LENGTH_OPTIONS = ['Short', 'Medium', 'Long'];
const DEFAULT_MODE_OPTIONS = ['Legal Drafting', 'Contract Review', 'Legal Research', 'Client Advice'];
const VOICE_TYPE_OPTIONS = ['Standard', 'Neural'];
const AUTO_DELETE_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'After 1 day', value: '1_day' },
  { label: 'After 7 days', value: '7_days' },
  { label: 'After 30 days', value: '30_days' },
];

export default function NeikxSettingsPanel({ onClose }: { onClose: () => void }) {
  const { profile, theme, toggleTheme, refreshAccount, isPro } = useApp();
  const [settings, setSettings] = useState({
    language: 'English',
    response_style: 'Balanced',
    response_length: 'Medium',
    default_ai_mode: 'Legal Drafting',
    voice_mode_enabled: false,
    voice_type: 'Standard',
    voice_speed: 1,
    auto_speak: false,
    save_chat_history: true,
    auto_delete_chats: 'never',
    notify_product_updates: true,
    notify_new_features: true,
    notify_referrals: true,
  });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setSettings({
      language: profile.language || 'English',
      response_style: profile.response_style || 'Balanced',
      response_length: profile.response_length || 'Medium',
      default_ai_mode: profile.default_ai_mode || 'Legal Drafting',
      voice_mode_enabled: profile.voice_mode_enabled ?? false,
      voice_type: profile.voice_type || 'Standard',
      voice_speed: profile.voice_speed ?? 1,
      auto_speak: profile.auto_speak ?? false,
      save_chat_history: profile.save_chat_history !== false,
      auto_delete_chats: profile.auto_delete_chats || 'never',
      notify_product_updates: profile.notify_product_updates ?? true,
      notify_new_features: profile.notify_new_features ?? true,
      notify_referrals: profile.notify_referrals ?? true,
    });
  }, [profile]);

  const persistSettings = async (updates: Partial<Profile>) => {
    setSaving(true);
    setStatus('Saving...');

    try {
      await updateProfile(updates);
      await refreshAccount();
      setStatus('Saved');
      window.setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error('Neikx settings save error:', err);
      setStatus('Failed to save');
      window.setTimeout(() => setStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = async <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'voice_speed') {
      await persistSettings({ [key]: Number(value) } as Partial<Profile>);
    } else {
      await persistSettings({ [key]: value } as Partial<Profile>);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="text-right">
          <p className="text-cream text-xs uppercase tracking-[0.3em]">Neikx AI Settings</p>
          <p className="text-cream/50 text-xs">{status || (saving ? 'Saving...' : 'Changes saved automatically')}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Theme</h3>
        </div>
        <p className="text-cream/60 text-sm">Neikx AI theme controls are managed here.</p>
        <button
          type="button"
          onClick={toggleTheme}
          disabled={saving}
          className="btn-secondary w-full text-sm"
        >
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Language</h3>
        </div>
        <select
          value={settings.language}
          onChange={(e) => void handleChange('language', e.target.value)}
          disabled={saving}
          className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">AI Response</h3>
        </div>
        <div className="grid gap-3">
          <div>
            <p className="text-cream/80 text-sm mb-2">Response Style</p>
            <select
              value={settings.response_style}
              onChange={(e) => void handleChange('response_style', e.target.value)}
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
            >
              {RESPONSE_STYLE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-cream/80 text-sm mb-2">Response Length</p>
            <select
              value={settings.response_length}
              onChange={(e) => void handleChange('response_length', e.target.value)}
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
            >
              {RESPONSE_LENGTH_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-cream/80 text-sm mb-2">Default AI Mode</p>
            <select
              value={settings.default_ai_mode}
              onChange={(e) => void handleChange('default_ai_mode', e.target.value)}
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
            >
              {DEFAULT_MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Music2 className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Voice Settings</h3>
        </div>
        <div className="grid gap-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-sm text-cream">
            <span>Voice Mode</span>
            <input
              type="checkbox"
              checked={settings.voice_mode_enabled}
              onChange={(e) => void handleChange('voice_mode_enabled', e.target.checked)}
              disabled={saving}
              className="h-5 w-5 accent-gold"
            />
          </label>
          <div>
            <p className="text-cream/80 text-sm mb-2">Voice Type</p>
            <select
              value={settings.voice_type}
              onChange={(e) => void handleChange('voice_type', e.target.value)}
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
            >
              {VOICE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-cream/80 text-sm mb-2">Voice Speed</p>
            <select
              value={settings.voice_speed.toString()}
              onChange={(e) => void handleChange('voice_speed', Number(e.target.value))}
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
            >
              {[0.8, 1, 1.2, 1.4].map((speed) => (
                <option key={speed} value={speed}>{speed}x</option>
              ))}
            </select>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-sm text-cream">
            <span>Auto Speak</span>
            <input
              type="checkbox"
              checked={settings.auto_speak}
              onChange={(e) => void handleChange('auto_speak', e.target.checked)}
              disabled={saving}
              className="h-5 w-5 accent-gold"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <RefreshCcw className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Chat Settings</h3>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-sm text-cream">
          <span>Save Chat History</span>
          <input
            type="checkbox"
            checked={settings.save_chat_history}
            onChange={(e) => void handleChange('save_chat_history', e.target.checked)}
            disabled={saving}
            className="h-5 w-5 accent-gold"
          />
        </label>
        <div>
          <p className="text-cream/80 text-sm mb-2">Auto Delete Chats</p>
          <select
            value={settings.auto_delete_chats}
            onChange={(e) => void handleChange('auto_delete_chats', e.target.value)}
            disabled={saving}
            className="w-full rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-white text-sm focus:border-gold focus:ring-0"
          >
            {AUTO_DELETE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-sm text-cream">
          <span>Product updates</span>
          <input
            type="checkbox"
            checked={settings.notify_product_updates}
            onChange={(e) => void handleChange('notify_product_updates', e.target.checked)}
            disabled={saving}
            className="h-5 w-5 accent-gold"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-sm text-cream">
          <span>New feature alerts</span>
          <input
            type="checkbox"
            checked={settings.notify_new_features}
            onChange={(e) => void handleChange('notify_new_features', e.target.checked)}
            disabled={saving}
            className="h-5 w-5 accent-gold"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d111b] px-4 py-3 text-sm text-cream">
          <span>Referral updates</span>
          <input
            type="checkbox"
            checked={settings.notify_referrals}
            onChange={(e) => void handleChange('notify_referrals', e.target.checked)}
            disabled={saving}
            className="h-5 w-5 accent-gold"
          />
        </label>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Privacy & Security</h3>
        </div>
        <p className="text-cream/60 text-sm leading-relaxed">
          Neikx AI keeps your chat history and preferences secure. We only store settings needed for your assistant experience.
        </p>
        <Link href="/settings" className="btn-secondary w-full text-sm text-left">
          Manage privacy settings in your account
        </Link>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">Neikx Premium</h3>
        </div>
        <div className="text-cream/70 text-sm">
          {isPro
            ? 'You have Pro access. Enjoy unlimited chat and priority responses.'
            : 'Unlock Pro to remove limits, access premium voice modes, and get faster responses.'}
        </div>
        {!isPro && (
          <Link href="/pricing" className="btn-primary w-full text-sm">
            Upgrade to Pro
          </Link>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#111827] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#a8b8d8]" />
          <h3 className="text-sm font-semibold text-white">About Neikx</h3>
        </div>
        <p className="text-cream/60 text-sm leading-relaxed">
          Neikx AI is your dedicated legal assistant inside Draftee. Control how it responds, speaks, and stores conversations from this panel.
        </p>
        <Link href="/help" className="btn-secondary w-full text-sm">
          Open Help Center
        </Link>
      </section>
    </div>
  );
}
