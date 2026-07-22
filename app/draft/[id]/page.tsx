'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isProfileComplete } from '@/lib/isProfileComplete'

export default function DraftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [draft, setDraft] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user?.id) {
        console.error('Unable to load current user', authError)
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', id)
        .single()

      if (draftError || !draftData) {
        console.error('Draft load failed:', draftError)
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Profile load failed:', profileError)
      }

      setDraft(draftData)
      setProfile(profileData)
      setIsPremium(Boolean(profileData?.plan && profileData.plan !== 'free'))
      setLoading(false)
    }

    load()
  }, [id])

  function checkProfile() {
    if (!isProfileComplete(profile)) {
      alert('Please complete your profile to use this feature.')
      router.push('/profile')
      return false
    }
    return true
  }

  function handleCopy() {
    const content = draft.generated_draft || draft.draft_content || draft.draftContent || ''
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleTxt() {
    if (!checkProfile()) return
    const content = draft.generated_draft || draft.draft_content || draft.draftContent || ''
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${draft.document_type || draft.draft_type || 'draft'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePDF() {
    if (!checkProfile()) return
    window.print()
  }

  function handleWhatsApp() {
    if (!checkProfile()) return
    const content = draft.generated_draft || draft.draft_content || draft.draftContent || ''
    window.open('https://wa.me/?text=' + encodeURIComponent(content), '_blank')
  }

  function handleEmail() {
    if (!checkProfile()) return
    const content = draft.generated_draft || draft.draft_content || draft.draftContent || ''
    window.open(
      'mailto:?subject=' +
        encodeURIComponent(draft.document_type || draft.draft_type || 'Legal Draft') +
        '&body=' +
        encodeURIComponent(content)
    )
  }

  function handleEdit() {
    router.push('/generate?draftId=' + id)
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0f1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e8e0d0',
        }}
      >
        Loading...
      </div>
    )
  }

  if (!draft || notFound) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0f1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e8e0d0',
        }}
      >
        Draft not found.
      </div>
    )
  }

  const draftContent = draft.generated_draft || draft.draft_content || draft.draftContent || ''
  const draftTitle = draft.document_type || draft.draft_type || 'Legal Draft'
  const createdAt = draft.created_at ? new Date(draft.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : ''

  const actions = [
    { label: '✏️ Edit', fn: handleEdit },
    { label: copied ? '✓ Copied!' : '📋 Copy', fn: handleCopy },
    { label: '📄 .txt', fn: handleTxt },
    { label: '📑 PDF', fn: handlePDF },
    { label: '💬 WhatsApp', fn: handleWhatsApp },
    { label: '📧 Email', fn: handleEmail },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0f1e',
        color: '#e8e0d0',
        padding: '24px 20px 100px',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          color: '#c9a84c',
          cursor: 'pointer',
          fontSize: '0.9rem',
          marginBottom: '20px',
          padding: 0,
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>{draftTitle}</h1>
      <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '24px' }}>{createdAt}</p>

      <div
        style={{
          background: '#0f1525',
          border: '1px solid #1e2a3a',
          borderRadius: '14px',
          padding: '24px',
          fontSize: '0.95rem',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          marginBottom: '28px',
        }}
      >
        {draftContent}
      </div>

      {isPremium ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          {actions.map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              style={{
                background: '#0f1525',
                border: '1px solid #1e2a3a',
                borderRadius: '10px',
                color: '#e8e0d0',
                padding: '12px 8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#0f1525',
          border: '1px solid #c9a84c',
          borderRadius: '12px',
          marginTop: '20px',
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
  )
}
