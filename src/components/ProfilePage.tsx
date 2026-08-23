'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { isProfileComplete } from '../lib/isProfileComplete';

export default function ProfilePage() {
  const router = useRouter();
  const { session, setProfile: setGlobalProfile } = useApp();
  
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [form, setForm] = useState({
    full_name: '',
    advocate_name: '', // used for display_name
    state: '',
    city: '',
    email: '',
    whatsapp_number: '',
  });
  
  const [bio, setBio] = useState('');
  const [currentPlan, setCurrentPlan] = useState('free');
  
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Fetch profile
  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setLocalProfile(data);
        setForm({
          full_name: data.full_name || '',
          advocate_name: data.advocate_name || '',
          state: data.state || '',
          city: data.city || '',
          email: data.email || '',
          whatsapp_number: data.whatsapp_number || '',
        });
        setBio(data.bio || '');
        setGlobalProfile(data); // Sync global context
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch drafts
  const fetchDrafts = async () => {
    if (!session?.user?.id) return;
    setLoadingDrafts(true);
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setDrafts(data);
      }
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const fetchPlan = async () => {
    if (!session?.user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, drafts_used, drafts_limit, plan_expires_at')
        .eq('user_id', session.user.id)
        .single();
      if (profile) {
        if (profile.plan !== 'free' && profile.plan_expires_at) {
          const expired = new Date(profile.plan_expires_at) < new Date();
          if (expired) {
            setCurrentPlan('free');
            return;
          }
        }
        setCurrentPlan(profile.plan || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      fetchPlan();
      fetchDrafts();
    } else {
      setLoadingProfile(false);
    }
  }, [session?.user?.id]);

  const handleSaveForm = async () => {
    if (!session?.user?.id) {
      setMessage('Please log in first.');
      return;
    }
    try {
      const payload = {
        id: session.user.id,
        user_id: session.user.id,
        full_name: form.full_name,
        advocate_name: form.advocate_name,
        state: form.state,
        city: form.city,
        email: form.email,
        whatsapp_number: form.whatsapp_number,
        updated_at: new Date().toISOString(),
      };

      console.log('Profile payload (client):', payload);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .maybeSingle();

      console.log('Profile upsert response (client):', { data, error });

      if (error) throw error;

      setMessage('Profile saved successfully!');
      setIsEditing(false);
      await fetchProfile(); // Refetch to update UI state B

      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage('Error: ' + err.message);
    }
  };

  const handleSaveBio = async () => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio })
        .eq('user_id', session.user.id);
        
      if (!error) {
        await fetchProfile();
      }
    } catch (err) {
      console.error('Bio save error:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', session.user.id);
        
      if (updateError) throw updateError;
      
      await fetchProfile();
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload photo: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCopyDraft = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates({ ...copiedStates, [id]: true });
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleTxtDownload = (draft: any) => {
    const content = draft.generated_draft || draft.draftContent || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.draft_type || 'Draft'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const requireProfileComplete = (callback: () => void) => {
    if (!localProfile || !isProfileComplete(localProfile)) {
      alert("Please complete your profile to use this feature.");
      if (!isEditing) setIsEditing(true);
      return;
    }
    callback();
  };

  const handlePdfDownload = (draft: any) => {
    requireProfileComplete(() => {
      // For now, trigger print if no existing PDF logic
      window.print(); 
    });
  };

  const handleWhatsAppShare = (draft: any) => {
    requireProfileComplete(() => {
      const content = draft.generated_draft || draft.draftContent || '';
      window.open(`https://wa.me/?text=${encodeURIComponent(content)}`);
    });
  };

  const handleEmailShare = (draft: any) => {
    requireProfileComplete(() => {
      const content = draft.generated_draft || draft.draftContent || '';
      window.open(`mailto:?subject=Legal Draft&body=${encodeURIComponent(content)}`);
    });
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-[#c9a84c]">Loading Profile...</div>
        </main>
      </div>
    );
  }

  const isComplete = localProfile ? isProfileComplete(localProfile) : false;
  const showForm = !isComplete || isEditing;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col text-[#e8e0d0]">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        
        {/* Profile Completion Banner */}
        {!isComplete && (
          <div style={{
            border: '1px solid #c9a84c',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            background: '#0f1525',
            color: '#e8e0d0',
            fontSize: '0.9rem',
          }}>
            ⚠️ Complete your profile to unlock PDF download, WhatsApp sharing and more.
          </div>
        )}

        {showForm ? (
          /* STATE A: INCOMPLETE / EDITING FORM */
          <section className="space-y-6 mb-8 p-6 bg-[#0f1525] border border-[#1e2a3a] rounded-3xl">
            <h1 className="font-display text-3xl text-[#c9a84c] mb-6">
              {isEditing && isComplete ? 'Edit Profile' : 'Complete Profile'}
            </h1>

            <div className="space-y-4">
              <p style={{
                fontSize: '0.78rem',
                color: '#c9a84c',
                opacity: 0.8,
                marginBottom: '16px',
              }}>
                (* All fields are mandatory)
              </p>
              <label className="block space-y-2 text-sm text-[#e8e0d0]/80">
                <span>Full Name</span>
                <input
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0a0f1e] px-4 py-3 text-white placeholder:text-white/20"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </label>

              <label className="block space-y-2 text-sm text-[#e8e0d0]/80">
                <span>Display Name</span>
                <input
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0a0f1e] px-4 py-3 text-white placeholder:text-white/20"
                  placeholder="How you want to appear"
                  value={form.advocate_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, advocate_name: e.target.value }))}
                />
              </label>

              <label className="block space-y-2 text-sm text-[#e8e0d0]/80">
                <span>State</span>
                <input
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0a0f1e] px-4 py-3 text-white placeholder:text-white/20"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </label>

              <label className="block space-y-2 text-sm text-[#e8e0d0]/80">
                <span>City</span>
                <input
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0a0f1e] px-4 py-3 text-white placeholder:text-white/20"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </label>

              <label className="block space-y-2 text-sm text-[#e8e0d0]/80">
                <span>Email Address</span>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0a0f1e] px-4 py-3 text-white placeholder:text-white/20"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>

              <label className="block space-y-2 text-sm text-[#e8e0d0]/80">
                <span>WhatsApp Number</span>
                <input
                  type="tel"
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0a0f1e] px-4 py-3 text-white placeholder:text-white/20"
                  placeholder="+91 98765 43210"
                  maxLength={10}
                  value={form.whatsapp_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm((prev) => ({ ...prev, whatsapp_number: val }));
                  }}
                />
              </label>
            </div>

            {message && (
              <div className="rounded-2xl border px-4 py-3 text-sm text-[#e8e0d0]/90 bg-[#0a0f1e] border-[#c9a84c]/50">
                {message}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {isEditing && isComplete && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-2xl border border-[#c9a84c] px-5 py-3 text-sm font-semibold text-[#c9a84c] hover:bg-[#c9a84c]/10 transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveForm}
                className="flex-1 rounded-2xl bg-[#c9a84c] px-5 py-3 text-sm font-semibold text-[#0a0f1e] transition hover:bg-[#ffd166]"
              >
                Save Profile
              </button>
            </div>
          </section>
        ) : (
          /* STATE B: COMPLETE PROFILE VIEW */
          <div className="space-y-8">
            <section className="flex flex-col items-center text-center">
              <div className="relative group mb-4">
                {localProfile.avatar_url ? (
                  <img 
                    src={localProfile.avatar_url} 
                    alt="Profile Avatar" 
                    className="w-[90px] h-[90px] rounded-full object-cover border-2 border-[#1e2a3a]"
                  />
                ) : (
                  <div className="w-[90px] h-[90px] rounded-full bg-[#c9a84c] text-[#0a0f1e] flex items-center justify-center text-3xl font-bold border-2 border-[#1e2a3a]">
                    {(localProfile.full_name || localProfile.advocate_name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div 
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-xs font-semibold text-white">
                    {uploadingAvatar ? 'Uploading...' : 'Change'}
                  </span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <h1 className="text-3xl font-bold text-[#e8e0d0] mb-1">
                {localProfile.full_name || 'User'}
              </h1>
              <p className="text-[#c9a84c] text-sm mb-4">
                {localProfile.advocate_name || 'Display Name'}
              </p>

              <div className="w-full max-w-md">
                <textarea
                  className="w-full rounded-2xl border border-[#1e2a3a] bg-[#0f1525] px-4 py-3 text-sm text-center text-white placeholder:text-white/30 resize-none outline-none focus:border-[#c9a84c]/50 transition"
                  placeholder="Write something about yourself..."
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={handleSaveBio}
                />
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#0f1525', border: '1px solid #1e2a3a',
                borderRadius: '20px', padding: '8px 18px', marginTop: '16px'
              }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                  Current Plan
                </span>
                <span style={{ 
                  color: '#c9a84c', fontWeight: 700, fontSize: '0.9rem' 
                }}>
                  {currentPlan === 'free' ? 'Free' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                </span>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-full border border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c]/10 px-6 py-2 text-sm font-semibold transition"
                >
                  Edit Profile
                </button>
              </div>
            </section>

            {/* MY DRAFTS SECTION */}
            <section className="pt-8 border-t border-[#1e2a3a]">
              <h2 className="text-xl font-bold text-[#e8e0d0] mb-6">My Drafts</h2>
              
              {loadingDrafts ? (
                <div className="text-center py-8 text-[#e8e0d0]/50">Loading drafts...</div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-12 bg-[#0f1525] rounded-3xl border border-[#1e2a3a]">
                  <p className="text-[#e8e0d0]/60 mb-4">No drafts yet. Create your first draft!</p>
                  <Link 
                    href="/generate"
                    className="inline-block rounded-2xl bg-[#c9a84c] px-6 py-3 text-sm font-semibold text-[#0a0f1e] transition hover:bg-[#ffd166]"
                  >
                    Generate Draft
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {drafts.map((draft) => {
                    const content = draft.generated_draft || draft.draftContent || '';
                    const title = draft.party1_name 
                      ? (draft.party2_name ? `${draft.party1_name} vs ${draft.party2_name}` : draft.party1_name)
                      : (draft.draft_type || 'Untitled Draft');
                      
                    return (
                      <div
                        key={draft.id}
                        onClick={() => router.push('/draft/' + draft.id)}
                        style={{
                          cursor: 'pointer',
                          background: '#0f1525',
                          border: '1px solid #1e2a3a',
                          borderRadius: '12px',
                          padding: '16px 18px',
                          marginBottom: '12px',
                        }}
                        className="hover:border-[#c9a84c]/30 transition"
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#e8e0d0' }}>
                          {title}
                        </div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.55, color: '#e8e0d0' }}>
                          {formatDate(draft.created_at)}
                        </div>
                        {draft.status && (
                          <div style={{ 
                            marginTop: '8px',
                            fontSize: '0.75rem',
                            color: draft.status === 'completed' ? '#00d4aa' : '#c9a84c'
                          }}>
                            {draft.status}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
