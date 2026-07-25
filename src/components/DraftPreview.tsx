'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { downloadDraftPdf } from '../lib/exportDraftPdf';
import { stripMarkdown } from '../lib/stripMarkdown';
import { openEmailDraft, openWhatsAppShare } from '../lib/shareDraft';
import { supabase } from '../lib/supabase';
import { updateProfile } from '../lib/userAccount';
import { useApp } from '../context/AppContext';
import { isProfileComplete } from '../lib/isProfileComplete';

export default function DraftPreview({
  draft,
  draftId,
  onDraftChange,
  formData,
  onRegenerate,
  onSave,
  isGenerating,
  isSaving,
  saveSuccess,
  error,
  offlineWarning,
  onRetry,
  profile,
  refreshAccount,
  onActionBusyChange,
}: {
  draft: string;
  draftId: string | null;
  onDraftChange?: (draft: string) => void;
  formData: any;
  onRegenerate?: () => void;
  onSave?: () => void;
  isGenerating: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string | null;
  offlineWarning: string | null;
  onRetry?: () => void;
  profile: any;
  refreshAccount: () => void;
  onActionBusyChange?: (busy: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', barCouncilNumber: '', cityCourt: '' });
  const [pendingAction, setPendingAction] = useState<null | 'copy' | 'pdf' | 'whatsapp' | 'email'>(null);
  const { setProfile } = useApp();
  const router = useRouter();

  const displayDraft = useMemo(
    () => (draft ? stripMarkdown(draft) : ''),
    [draft]
  );

  const hasNameField = (profile: any) => Boolean(profile?.advocate_name?.trim() || profile?.full_name?.trim());

  const getCachedProfileStatus = () => {
    if (typeof window === 'undefined') return { profileComplete: null, cachedUserId: null };
    return {
      profileComplete:
        window.localStorage.getItem('profileComplete') ||
        window.localStorage.getItem('draftee_profile_complete'),
      cachedUserId: window.localStorage.getItem('draftee_user_id'),
    };
  };

  const setProfileCache = (userId?: string | null) => {
    if (typeof window === 'undefined') return;
    if (userId) {
      window.localStorage.setItem('profileComplete', 'true');
      window.localStorage.setItem('draftee_profile_complete', 'true');
      window.localStorage.setItem('draftee_user_id', userId);
    } else {
      clearProfileCache();
    }
  };

  const clearProfileCache = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('profileComplete');
    window.localStorage.removeItem('draftee_profile_complete');
    window.localStorage.removeItem('draftee_user_id');
  };

  const checkProfileForAction = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (hasNameField(profile)) {
      setProfileCache(user?.id);
      return { hasProfile: true, profile };
    }

    if (typeof window !== 'undefined') {
      const { profileComplete, cachedUserId } = getCachedProfileStatus();
      if (profileComplete === 'true' && cachedUserId && user?.id && cachedUserId === user.id) {
        return { hasProfile: true, profile };
      }
    }

    if (!user?.id) {
      clearProfileCache();
      return { hasProfile: false, profile: null as any };
    }

    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('advocate_name, full_name, bar_council_number, court_jurisdiction, city')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Profile lookup failed before action:', error);
      return { hasProfile: false, profile: null as any };
    }

    const hasName = hasNameField(profileRow);
    if (hasName) {
      setProfileCache(user.id);
    } else {
      clearProfileCache();
    }

    return { hasProfile: hasName, profile: profileRow as any };
  };

  const ensureProfileForAction = async (action: 'copy' | 'pdf' | 'whatsapp' | 'email') => {
    const { hasProfile, profile: profileRow } = await checkProfileForAction();

    if (!hasProfile) {
      setProfileForm({
        name: profileRow?.advocate_name || profileRow?.full_name || profile?.advocate_name || profile?.full_name || '',
        barCouncilNumber: profileRow?.bar_council_number || profile?.bar_council_number || '',
        cityCourt: profileRow?.court_jurisdiction || profileRow?.city || profile?.court_jurisdiction || profile?.city || '',
      });
      setPendingAction(action);
      setShowProfileModal(true);
      return false;
    }

    return true;
  };

  const startEdit = () => {
    setEditBuffer(displayDraft);
    setIsEditing(true);
  };

  const saveEdits = () => {
    onDraftChange?.(editBuffer);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditBuffer('');
  };



  const handleCopy = async () => {
    if (!displayDraft) return;

    const { data: userData } = await supabase.auth.getUser();
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('user_id', userData?.user?.id).maybeSingle();
    
    if (!isProfileComplete(profileRow)) {
      alert('Please complete your profile before using this feature.');
      router.push('/profile');
      return;
    }

    const canProceed = await ensureProfileForAction('copy');
    if (!canProceed) return;

    onActionBusyChange?.(true);
    try {
      await navigator.clipboard.writeText(displayDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    } finally {
      onActionBusyChange?.(false);
    }
  };

  const handleDownloadTxt = async () => {
    if (!displayDraft) return;

    const { data: userData } = await supabase.auth.getUser();
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('user_id', userData?.user?.id).maybeSingle();
    
    if (!isProfileComplete(profileRow)) {
      alert('Please complete your profile before using this feature.');
      router.push('/profile');
      return;
    }

    const type = formData?.draftType?.replace(/\s+/g, '_') || 'legal_draft';
    const blob = new Blob([displayDraft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!displayDraft || isPdfLoading) return;
    setPdfError(null);

    const { data: userData } = await supabase.auth.getUser();
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('user_id', userData?.user?.id).maybeSingle();
    
    if (!isProfileComplete(profileRow)) {
      alert('Please complete your profile before using this feature.');
      router.push('/profile');
      return;
    }

    const canProceed = await ensureProfileForAction('pdf');
    if (!canProceed) return;

    onActionBusyChange?.(true);
    setIsPdfLoading(true);
    try {
      await downloadDraftPdf(displayDraft, formData);
    } catch (err) {
      console.error('PDF export failed:', err);
      setPdfError('PDF could not be downloaded. Please try again.');
    } finally {
      setIsPdfLoading(false);
      onActionBusyChange?.(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!displayDraft) return;

    const { data: userData } = await supabase.auth.getUser();
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('user_id', userData?.user?.id).maybeSingle();
    
    if (!isProfileComplete(profileRow)) {
      alert('Please complete your profile before using this feature.');
      router.push('/profile');
      return;
    }

    const canProceed = await ensureProfileForAction('whatsapp');
    if (!canProceed) return;

    onActionBusyChange?.(true);
    try {
      openWhatsAppShare(displayDraft);
    } finally {
      onActionBusyChange?.(false);
    }
  };

  const handleEmail = async () => {
    if (!displayDraft) return;

    const { data: userData } = await supabase.auth.getUser();
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('user_id', userData?.user?.id).maybeSingle();
    
    if (!isProfileComplete(profileRow)) {
      alert('Please complete your profile before using this feature.');
      router.push('/profile');
      return;
    }

    const canProceed = await ensureProfileForAction('email');
    if (!canProceed) return;

    onActionBusyChange?.(true);
    try {
      openEmailDraft({
        body: displayDraft,
        draftType: formData?.draftType,
      });
    } finally {
      onActionBusyChange?.(false);
    }
  };

  const handleSaveWrapper = () => {
    onSave?.();
  };

  const performPendingAction = async () => {
    if (!pendingAction) return;
    const text = displayDraft;
    try {
      if (pendingAction === 'copy') {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (pendingAction === 'pdf') {
        setIsPdfLoading(true);
        try {
          await downloadDraftPdf(text, formData);
        } catch (err) {
          console.error('PDF export failed after profile save:', err);
          setPdfError('PDF could not be downloaded. Please try again.');
        } finally {
          setIsPdfLoading(false);
        }
      } else if (pendingAction === 'whatsapp') {
        openWhatsAppShare(text);
      } else if (pendingAction === 'email') {
        openEmailDraft({ body: text, draftType: formData?.draftType });
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const updates: any = {
        advocate_name: profileForm.name?.trim() || null,
        full_name: profileForm.name?.trim() || null,
        bar_council_number: profileForm.barCouncilNumber?.trim() || null,
        court_jurisdiction: profileForm.cityCourt?.trim() || null,
        city: profileForm.cityCourt?.trim() || null,
      };
      const savedProfile = await updateProfile(updates);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      setProfileCache(userId);
      if (savedProfile) {
        setProfile((prev) => ({ ...prev, ...savedProfile }));
      }

      setShowProfileModal(false);
      await performPendingAction();
    } catch (err: any) {
      console.error('Saving profile failed:', err);
      alert(err.message || 'Could not save profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const isPremium = profile?.plan === 'premium' && profile?.plan_expires_at != null && new Date(profile.plan_expires_at) > new Date();
  console.log('RENDER: isPremium value at render time:', isPremium, 'profile:', profile);

  return (
    <div className="card h-full flex flex-col min-h-[400px] lg:min-h-0">
      {showProfileModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm">
          <div className="card max-w-md w-full space-y-4">
            <div className="space-y-2 text-center">
              <h3 className="font-display text-xl text-cream">Complete Your Profile</h3>
              <p className="text-cream/70 text-sm">Please add your name and city/court to continue.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-cream/80">Name <span className="text-red-400">*</span></label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-cream/80">Bar Council Number <span className="text-cream/60 text-xs">(Optional)</span></label>
                <input
                  value={profileForm.barCouncilNumber}
                  onChange={(e) => setProfileForm((p) => ({ ...p, barCouncilNumber: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-cream/80">City / Court <span className="text-red-400">*</span></label>
                <input
                  value={profileForm.cityCourt}
                  onChange={(e) => setProfileForm((p) => ({ ...p, cityCourt: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!profileForm.name.trim() || !profileForm.cityCourt.trim()) {
                    alert('Please enter Name and City / Court');
                    return;
                  }
                  await handleProfileSave();
                }}
                disabled={profileSaving}
                className="btn-primary flex-1"
              >
                {profileSaving ? 'Saving…' : 'Save & Continue'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setPendingAction(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
        <h2 className="font-display text-lg text-cream">Draft Preview</h2>
        {draft && !isGenerating && !isEditing && (
          <span className="text-xs text-gold/80 bg-gold/10 px-2 py-1 rounded">
            Ready
          </span>
        )}
        {isEditing && (
          <span className="text-xs text-gold bg-gold/20 px-2 py-1 rounded">Editing</span>
        )}
      </div>

      <div className="flex-1 overflow-auto mb-4 min-h-0">
        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-4">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-cream/70 text-sm">Generating draft...</p>
          </div>
        )}

        {error && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-4 text-center px-4">
            <p className="text-red-400/90 text-sm max-w-md">
              {typeof error === 'string' ? error : 'Draft could not be generated. Please try again.'}
            </p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="btn-primary text-sm">
                Retry
              </button>
            )}
          </div>
        )}

        {!isGenerating && !error && draft && isEditing && (
          <textarea
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            className="w-full h-full min-h-[320px] text-sm leading-relaxed font-body resize-y"
            aria-label="Edit draft"
          />
        )}

        {!isGenerating && !error && draft && !isEditing && (
          <pre className="animate-fade-in whitespace-pre-wrap font-body text-sm text-cream/90 leading-relaxed bg-navy/50 rounded-lg p-5 border border-border/50 print:text-black print:bg-white">
            {displayDraft}
          </pre>
        )}

        {!isGenerating && !error && !draft && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center px-6">
            <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gold/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-cream/50 text-sm">
              Fill the form and click Generate — your draft will appear here
            </p>
          </div>
        )}
      </div>

      {pdfError && draft && !isGenerating && !error && (
        <p className="text-red-400/90 text-xs px-1 mb-2">{pdfError}</p>
      )}

      {offlineWarning && draft && !isGenerating && !error && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 mb-4 text-center">
          <p className="text-gold text-sm font-medium">{offlineWarning}</p>
        </div>
      )}

      {draft && !isGenerating && !error && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          {isPremium ? (
            isEditing ? (
              <>
                <button type="button" onClick={saveEdits} className="btn-primary text-sm">
                  Save edits
                </button>
                <button type="button" onClick={cancelEdit} className="btn-secondary text-sm">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={startEdit} className="btn-secondary text-sm">
                  Edit draft
                </button>
                <button type="button" onClick={handleCopy} className="btn-secondary text-sm">
                  {copied ? 'Copied! ✓' : 'Copy'}
                </button>
                <button type="button" onClick={handleDownloadTxt} className="btn-secondary text-sm">
                  .txt
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isPdfLoading}
                  className="btn-secondary text-sm"
                >
                  {isPdfLoading ? 'PDF…' : 'PDF'}
                </button>
                <button type="button" onClick={handleWhatsApp} className="btn-secondary text-sm">
                  WhatsApp
                </button>
                <button type="button" onClick={handleEmail} className="btn-secondary text-sm">
                  Email
                </button>
                <button
                  type="button"
                  onClick={handleSaveWrapper}
                  disabled={isSaving || saveSuccess}
                  className="btn-secondary text-sm"
                >
                  {saveSuccess ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={onRegenerate} className="btn-primary text-sm ml-auto">
                  Regenerate
                </button>
              </>
            )
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#0f1525',
              border: '1px solid #c9a84c',
              borderRadius: '12px',
              marginTop: '10px',
              width: '100%',
            }}>
              <p style={{ color: '#e8e0d0', marginBottom: '12px', fontSize: '0.95rem' }}>
                ✨ Upgrade to Premium to download, share and edit drafts.
              </p>
              <a href="/pricing" style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #c9a84c, #e3c47e)',
                color: '#0a0f1e',
                borderRadius: '10px',
                padding: '12px 28px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}>
                Upgrade Now →
              </a>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
