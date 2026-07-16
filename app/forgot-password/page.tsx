'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://draftee.in/reset-password',
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📧</div>
        <h2 style={{ color: '#c9a84c', marginBottom: '12px' }}>
          Check your email!
        </h2>
        <p style={{ opacity: 0.75, color: '#e8e0d0' }}>
          We sent a password reset link to {email}.
        </p>
        <a href="/login" style={{
          display: 'inline-block', marginTop: '24px',
          color: '#c9a84c', fontSize: '0.9rem'
        }}>
          ← Back to Login
        </a>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: '#0f1525', border: '1px solid #1e2a3a',
        borderRadius: '16px', padding: '40px 32px',
        width: '100%', maxWidth: '420px',
      }}>
        <h1 style={{ color: '#e8e0d0', fontSize: '1.5rem',
          fontWeight: 700, marginBottom: '8px' }}>
          Forgot Password?
        </h1>
        <p style={{ opacity: 0.65, fontSize: '0.9rem', marginBottom: '28px', color: '#e8e0d0' }}>
          Enter your email and we'll send you a reset link.
        </p>

        <label style={{ color: '#c9a84c', fontSize: '0.85rem',
          display: 'block', marginBottom: '8px' }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{
            width: '100%', padding: '13px 16px',
            background: '#0a0f1e', border: '1px solid #1e2a3a',
            borderRadius: '10px', color: '#e8e0d0',
            fontSize: '0.95rem', marginBottom: '8px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#ff6b6b', fontSize: '0.82rem', marginBottom: '8px' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #c9a84c, #e3c47e)',
            color: '#0a0f1e', border: 'none',
            borderRadius: '10px', fontWeight: 700,
            fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer',
            marginTop: '8px', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <a href="/login" style={{
          display: 'block', textAlign: 'center',
          marginTop: '20px', color: '#c9a84c',
          fontSize: '0.85rem', textDecoration: 'none',
        }}>
          ← Back to Login
        </a>
      </div>
    </div>
  )
}
