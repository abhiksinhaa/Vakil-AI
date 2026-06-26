'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Moon, Sun, Monitor, Globe, Sparkles, MessageSquare, Mic, Volume2, 
  Settings as SettingsIcon, Scale, Clock, Trash2, Bell, Shield, 
  LogOut, Crown, Info, Bug, ShieldCheck, FileText, Smartphone,
  CheckCircle2, AlertTriangle, Download
} from 'lucide-react';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import TermsContent from './TermsContent';
import PrivacyContent from './PrivacyContent';
import FeedbackModal from './FeedbackModal';
import { updateProfile } from '../lib/userAccount';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme, session, profile, refreshAccount, subscription, isPro } = useApp();
  
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [bugText, setBugText] = useState('');
  const [showBugSuccess, setShowBugSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  
  // Local state for settings to ensure smooth UI before Firebase sync
  const [settings, setSettings] = useState({
    theme: profile?.theme || 'dark',
    language: profile?.language || 'English',
    response_style: profile?.response_style || 'Professional',
    response_length: profile?.response_length || 'Detailed',
    default_ai_mode: profile?.default_ai_mode || 'Draft Generator',
    voice_mode_enabled: profile?.voice_mode_enabled ?? true,
    voice_type: profile?.voice_type || 'Female',
    voice_speed: profile?.voice_speed || 1.0,
    auto_speak: profile?.auto_speak ?? false,
    preferred_court_format: profile?.preferred_court_format || 'District Court',
    preferred_draft_language: profile?.preferred_draft_language || 'English',
    default_jurisdiction: profile?.default_jurisdiction || 'All Indian States and UTs',
    save_chat_history: profile?.save_chat_history ?? true,
    auto_delete_chats: profile?.auto_delete_chats || 'Never',
    notify_product_updates: profile?.notify_product_updates ?? true,
    notify_new_features: profile?.notify_new_features ?? true,
    notify_referrals: profile?.notify_referrals ?? true,
  });

  useEffect(() => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        theme: profile.theme || 'dark',
        language: profile.language || 'English',
        response_style: profile.response_style || 'Professional',
        response_length: profile.response_length || 'Detailed',
        default_ai_mode: profile.default_ai_mode || 'Draft Generator',
        voice_mode_enabled: profile.voice_mode_enabled ?? true,
        voice_type: profile.voice_type || 'Female',
        voice_speed: profile.voice_speed || 1.0,
        auto_speak: profile.auto_speak ?? false,
        preferred_court_format: profile.preferred_court_format || 'District Court',
        preferred_draft_language: profile.preferred_draft_language || 'English',
        default_jurisdiction: profile.default_jurisdiction || 'All Indian States and UTs',
        save_chat_history: profile.save_chat_history ?? true,
        auto_delete_chats: profile.auto_delete_chats || 'Never',
        notify_product_updates: profile.notify_product_updates ?? true,
        notify_new_features: profile.notify_new_features ?? true,
        notify_referrals: profile.notify_referrals ?? true,
      }));
    }
  }, [profile]);

  const updateSetting = async (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    
    // Handle theme specifically if it's the global app theme
    if (key === 'theme') {
      if (value !== theme && (value === 'dark' || value === 'light')) {
        await toggleTheme(); 
      }
    }

    try {
      await updateProfile({ [key]: value });
      // We don't necessarily need to refreshAccount on every tiny toggle to save API calls,
      // but if we do, it updates global state.
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendBugReport = () => {
    if (!bugText.trim()) return;
    const mailtoLink = `mailto:abhiksinha1523@gmail.com?subject=Bug%20Report%20-%20Neikx%20AI&body=${encodeURIComponent(bugText)}`;
    window.location.href = mailtoLink;
    setShowBugSuccess(true);
    setTimeout(() => {
      setModalContent(null);
      setBugText('');
      setShowBugSuccess(false);
    }, 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/');
  };

  const SECTIONS = [
    { id: 'general', label: 'General Settings', icon: <SettingsIcon className="w-5 h-5" /> },
    { id: 'ai', label: 'AI Settings', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'voice', label: 'Voice Settings', icon: <Mic className="w-5 h-5" /> },
    { id: 'legal', label: 'Legal Preferences', icon: <Scale className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat Settings', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'premium', label: 'Premium', icon: <Crown className="w-5 h-5 text-gold" /> },
    { id: 'about', label: 'About', icon: <Info className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col font-sans text-white selection:bg-gold/30">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Mobile Section Selector */}
        <div className="md:hidden">
          <select 
            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-gold focus:border-gold outline-none"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
          >
            {SECTIONS.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.label}</option>
            ))}
          </select>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-24 bg-[#121212]/50 backdrop-blur-md rounded-2xl border border-white/5 p-3 flex flex-col gap-1">
            <h2 className="px-4 pt-2 pb-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Settings Menu</h2>
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all \${activeSection === sec.id ? 'bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.05)] font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}\`}
              >
                {sec.icon}
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 max-w-3xl pb-20">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-display font-medium text-white tracking-tight">
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h1>
            {saving && <span className="text-xs text-gold animate-pulse flex items-center gap-2"><Sparkles className="w-3 h-3"/> Saving...</span>}
          </div>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* GENERAL SETTINGS */}
            {activeSection === 'general' && (
              <>
                <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2"><Monitor className="w-5 h-5 text-gold"/> Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['Dark', 'Light', 'System Default'].map((t) => {
                        const val = t === 'System Default' ? 'system' : t.toLowerCase();
                        const isActive = settings.theme === val;
                        return (
                          <button 
                            key={t}
                            onClick={() => updateSetting('theme', val)}
                            className={\`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all \${isActive ? 'bg-gold/10 border-gold text-gold' : 'border-white/10 text-white/60 hover:border-white/30 hover:bg-white/5'}\`}
                          >
                            {t === 'Dark' ? <Moon className="w-5 h-5"/> : t === 'Light' ? <Sun className="w-5 h-5"/> : <Smartphone className="w-5 h-5"/>}
                            <span className="text-sm font-medium">{t}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full my-6"></div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2"><Globe className="w-5 h-5 text-gold"/> Language</h3>
                    <p className="text-sm text-white/50">Primary language for Neikx AI interactions.</p>
                    <div className="flex flex-wrap gap-3">
                      {['English', 'Hindi', 'Hinglish'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => updateSetting('language', lang)}
                          className={\`px-6 py-2.5 rounded-full border text-sm font-medium transition-all \${settings.language === lang ? 'bg-gold border-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-white/20 text-white hover:bg-white/10'}\`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* AI SETTINGS */}
            {activeSection === 'ai' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">Response Style</h3>
                    <p className="text-sm text-white/50 mt-1">Tone and complexity of the AI's answers.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Professional', 'Formal Legal', 'Simple', 'Detailed'].map(style => (
                      <button
                        key={style}
                        onClick={() => updateSetting('response_style', style)}
                        className={\`p-3 rounded-xl border text-sm text-center transition-all \${settings.response_style === style ? 'bg-gold/10 border-gold text-gold' : 'border-white/10 text-white/60 hover:bg-white/5'}\`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">Response Length</h3>
                  </div>
                  <div className="flex gap-3 bg-white/5 p-1 rounded-xl w-fit">
                    {['Short', 'Medium', 'Detailed'].map(len => (
                      <button
                        key={len}
                        onClick={() => updateSetting('response_length', len)}
                        className={\`px-6 py-2 rounded-lg text-sm font-medium transition-all \${settings.response_length === len ? 'bg-gold text-black shadow-md' : 'text-white/60 hover:text-white'}\`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">Default AI Mode</h3>
                    <p className="text-sm text-white/50 mt-1">Pre-selected capability when you open a new chat.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: 'Draft Generator', icon: <FileText className="w-4 h-4"/> },
                      { name: 'Legal Research', icon: <Scale className="w-4 h-4"/> },
                      { name: 'Document Review', icon: <SettingsIcon className="w-4 h-4"/> },
                      { name: 'General Chat', icon: <MessageSquare className="w-4 h-4"/> }
                    ].map(mode => (
                      <button
                        key={mode.name}
                        onClick={() => updateSetting('default_ai_mode', mode.name)}
                        className={\`flex items-center gap-3 p-4 rounded-xl border transition-all \${settings.default_ai_mode === mode.name ? 'bg-gold/5 border-gold text-gold' : 'border-white/10 text-white hover:bg-white/5'}\`}
                      >
                        <div className={\`p-2 rounded-lg \${settings.default_ai_mode === mode.name ? 'bg-gold/20' : 'bg-white/5'}\`}>
                          {mode.icon}
                        </div>
                        <span className="font-medium text-sm">{mode.name}</span>
                        {settings.default_ai_mode === mode.name && <CheckCircle2 className="w-4 h-4 ml-auto"/>}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* VOICE SETTINGS */}
            {activeSection === 'voice' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Voice Mode</h3>
                    <p className="text-sm text-white/50 mt-1">Enable real-time voice interactions.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.voice_mode_enabled} onChange={(e) => updateSetting('voice_mode_enabled', e.target.checked)} />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                  </label>
                </div>

                <div className={\`space-y-8 transition-opacity duration-300 \${!settings.voice_mode_enabled ? 'opacity-30 pointer-events-none' : ''}\`}>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-white/70">Voice Type</h3>
                    <div className="flex gap-3">
                      {['Male', 'Female'].map(vt => (
                        <button
                          key={vt}
                          onClick={() => updateSetting('voice_type', vt)}
                          className={\`px-6 py-2.5 rounded-full border text-sm font-medium transition-all \${settings.voice_type === vt ? 'bg-gold/10 border-gold text-gold' : 'border-white/20 text-white hover:bg-white/10'}\`}
                        >
                          {vt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <h3 className="text-sm font-medium text-white/70">Voice Speed</h3>
                      <span className="text-xs text-gold bg-gold/10 px-2 py-1 rounded font-mono">{settings.voice_speed.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" max="2.0" step="0.1" 
                      value={settings.voice_speed}
                      onChange={(e) => updateSetting('voice_speed', parseFloat(e.target.value))}
                      className="w-full accent-gold h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-white/40">
                      <span>Slow</span>
                      <span>Normal</span>
                      <span>Fast</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-gold"/>
                      <div>
                        <h3 className="text-sm font-medium text-white">Auto Speak Responses</h3>
                        <p className="text-xs text-white/50 mt-1">Read out AI responses automatically.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.auto_speak} onChange={(e) => updateSetting('auto_speak', e.target.checked)} />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                  </div>
                </div>
              </section>
            )}

            {/* LEGAL PREFERENCES */}
            {activeSection === 'legal' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Preferred Court Format</label>
                  <select 
                    value={settings.preferred_court_format} 
                    onChange={(e) => updateSetting('preferred_court_format', e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-gold focus:border-gold outline-none"
                  >
                    <option value="District Court">District Court</option>
                    <option value="High Court">High Court</option>
                    <option value="Supreme Court">Supreme Court</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Preferred Draft Language</label>
                  <select 
                    value={settings.preferred_draft_language} 
                    onChange={(e) => updateSetting('preferred_draft_language', e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-gold focus:border-gold outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Default Jurisdiction</label>
                  <select 
                    value={settings.default_jurisdiction} 
                    onChange={(e) => updateSetting('default_jurisdiction', e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-gold focus:border-gold outline-none"
                  >
                    <option value="All Indian States and UTs">All Indian States and UTs</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                  </select>
                </div>
                <p className="text-xs text-white/40">These settings are automatically injected into your legal draft prompts to ensure formatting accuracy.</p>
              </section>
            )}

            {/* CHAT SETTINGS */}
            {activeSection === 'chat' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div>
                    <h3 className="text-base font-medium text-white">Save Chat History</h3>
                    <p className="text-xs text-white/50 mt-1">Keep conversations synced across devices.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.save_chat_history} onChange={(e) => updateSetting('save_chat_history', e.target.checked)} />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                  </label>
                </div>

                <div className="space-y-2 pb-4 border-b border-white/5">
                  <label className="text-sm font-medium text-white/70">Auto Delete Chats</label>
                  <select 
                    value={settings.auto_delete_chats} 
                    onChange={(e) => updateSetting('auto_delete_chats', e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-gold focus:border-gold outline-none"
                  >
                    <option value="7 Days">After 7 Days</option>
                    <option value="30 Days">After 30 Days</option>
                    <option value="Never">Never</option>
                  </select>
                </div>

                <div>
                  <button onClick={() => setModalContent('clear_chats')} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium py-2">
                    <Trash2 className="w-4 h-4"/> Clear All Chats
                  </button>
                  <p className="text-xs text-white/30 mt-1">This will permanently delete all stored conversations on this device and cloud.</p>
                </div>
              </section>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-6">
                {[
                  { key: 'notify_product_updates', label: 'Product Updates', desc: 'News about major feature releases.' },
                  { key: 'notify_new_features', label: 'New Features', desc: 'Tips and tricks for new AI capabilities.' },
                  { key: 'notify_referrals', label: 'Referral Notifications', desc: 'Alerts when someone uses your code.' },
                ].map(notif => (
                  <div key={notif.key} className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-white">{notif.label}</h3>
                      <p className="text-xs text-white/50 mt-1">{notif.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={(settings as any)[notif.key]} onChange={(e) => updateSetting(notif.key, e.target.checked)} />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                  </div>
                ))}
              </section>
            )}

            {/* PRIVACY & SECURITY */}
            {activeSection === 'privacy' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-2">
                <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors text-left group">
                  <div>
                    <h3 className="text-base font-medium text-white group-hover:text-gold transition-colors">Change Password</h3>
                    <p className="text-xs text-white/50 mt-1">Update your account password</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-white/30 group-hover:text-gold"/>
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors text-left group">
                  <div>
                    <h3 className="text-base font-medium text-white group-hover:text-gold transition-colors">Export Chat History</h3>
                    <p className="text-xs text-white/50 mt-1">Download all data as JSON</p>
                  </div>
                  <Download className="w-5 h-5 text-white/30 group-hover:text-gold"/>
                </button>
                <div className="h-px bg-white/5 w-full my-2"></div>
                <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors text-left group">
                  <div>
                    <h3 className="text-base font-medium text-white group-hover:text-white transition-colors">Logout From All Devices</h3>
                  </div>
                  <LogOut className="w-5 h-5 text-white/30"/>
                </button>
                <button onClick={() => setModalContent('delete_account')} className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 rounded-xl transition-colors text-left group">
                  <div>
                    <h3 className="text-base font-medium text-red-400 group-hover:text-red-300 transition-colors">Delete Account</h3>
                    <p className="text-xs text-red-400/50 mt-1">Permanently remove your account and data</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-400/50 group-hover:text-red-400"/>
                </button>
              </section>
            )}

            {/* PREMIUM SECTION */}
            {activeSection === 'premium' && (
              <section className="space-y-6">
                <div className="bg-gradient-to-br from-gold/20 via-[#121212] to-[#121212] rounded-2xl border border-gold/30 p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Crown className="w-32 h-32 text-gold"/>
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-display font-medium text-gold mb-2">
                      {isPro ? 'Pro Member' : 'Free Plan'}
                    </h2>
                    <p className="text-sm text-white/70 max-w-md mb-8">
                      {isPro ? 'You have full access to Neikx AI capabilities.' : 'Upgrade to Neikx AI Pro for unlimited legal drafts, advanced chat modes, and priority processing.'}
                    </p>
                    
                    {!isPro && (
                      <Link href="/pricing" className="inline-flex items-center justify-center px-6 py-3 bg-gold text-black font-semibold rounded-xl hover:bg-gold/90 transition-colors shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                        Upgrade to Premium
                      </Link>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Drafts Generated', value: subscription?.drafts_this_month || 0 },
                    { label: 'Chat Sessions', value: subscription?.chat_messages_today || 0 },
                    { label: 'Documents Reviewed', value: 0 },
                    { label: 'Remaining Credits', value: isPro ? '∞' : Math.max(0, 10 - (subscription?.drafts_this_month || 0)) }
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
                      <p className="text-2xl font-display text-white">{stat.value}</p>
                      <p className="text-xs text-white/50 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ABOUT */}
            {activeSection === 'about' && (
              <section className="bg-[#121212] rounded-2xl border border-white/5 p-6 space-y-2">
                <div className="flex items-center justify-between p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <div>
                      <h3 className="font-display text-lg text-gold tracking-tight">Neikx AI</h3>
                      <p className="text-xs text-white/50">Version 2.5.0</p>
                    </div>
                  </div>
                </div>
                
                <button onClick={() => setModalContent('terms')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors text-left text-sm text-white/80">
                  Terms & Conditions
                </button>
                <button onClick={() => setModalContent('privacy_policy')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors text-left text-sm text-white/80">
                  Privacy Policy
                </button>
                <a href="mailto:support@draftee.in" className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors text-left text-sm text-white/80">
                  Contact Support
                </a>
                <button onClick={() => setModalContent('bug')} className="w-full flex items-center gap-2 p-4 hover:bg-gold/10 hover:text-gold rounded-xl transition-colors text-left text-sm text-white/80">
                  <Bug className="w-4 h-4"/> Report a Bug
                </button>
              </section>
            )}
            
          </div>
        </main>
      </div>

      {/* Modals */}
      {modalContent === 'bug' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121212] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="font-display text-xl text-gold">Report a Bug</h2>
              <button onClick={() => setModalContent(null)} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <Trash2 className="w-5 h-5 opacity-0" />
              </button>
            </div>
            <div className="p-6">
              {showBugSuccess ? (
                <div className="py-12 text-center text-gold animate-in fade-in">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-display text-xl">Thank you!</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={bugText}
                    onChange={(e) => setBugText(e.target.value.slice(0, 2000))}
                    placeholder="Describe the issue..."
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:border-gold outline-none min-h-[160px] resize-y mb-4"
                  />
                  <button onClick={handleSendBugReport} disabled={!bugText.trim()} className="w-full py-3 bg-gold text-black font-semibold rounded-xl disabled:opacity-50">
                    Send Report
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalContent === 'clear_chats' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121212] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4"/>
            <h2 className="text-xl font-medium text-white mb-2">Clear All Chats?</h2>
            <p className="text-sm text-white/50 mb-6">This action cannot be undone. All your chat history will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalContent(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors">Cancel</button>
              <button onClick={() => { /* Mock delete */ setModalContent(null); }} className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {modalContent === 'delete_account' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121212] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4"/>
            <h2 className="text-xl font-medium text-white mb-2">Delete Account?</h2>
            <p className="text-sm text-white/50 mb-6">This will permanently delete your account, subscription, and all generated drafts. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalContent(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors">Cancel</button>
              <button onClick={() => { /* Mock delete */ setModalContent(null); handleLogout(); }} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {(modalContent === 'terms' || modalContent === 'privacy_policy') && (
        <div className="fixed inset-0 z-[100] bg-[#080808] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#121212] sticky top-0 z-10">
            <h2 className="font-display text-xl text-gold">
              {modalContent === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
            </h2>
            <button onClick={() => setModalContent(null)} className="p-2 rounded-full hover:bg-white/10 text-white/70">
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-3xl mx-auto bg-[#121212] rounded-xl border border-white/5 p-6 sm:p-8">
              {modalContent === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
