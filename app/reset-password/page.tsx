'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleReset() {
    if (!password || !confirm) return
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  if (success) return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#e8e0d0',
      textAlign: 'center',
    }}>
      <div>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
        <h2 style={{ color: '#c9a84c' }}>Password Reset!</h2>
        <p style={{ opacity: 0.7 }}>Redirecting to login...</p>
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
          Reset Password
        </h1>
        <p style={{ opacity: 0.65, fontSize: '0.9rem', 
          marginBottom: '28px', color: '#e8e0d0' }}>
          Enter your new password below.
        </p>

        <label style={{ color: '#c9a84c', fontSize: '0.85rem',
          display: 'block', marginBottom: '8px' }}>
          New Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          style={{
            width: '100%', padding: '13px 16px',
            background: '#0a0f1e', border: '1px solid #1e2a3a',
            borderRadius: '10px', color: '#e8e0d0',
            fontSize: '0.95rem', marginBottom: '16px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        <label style={{ color: '#c9a84c', fontSize: '0.85rem',
          display: 'block', marginBottom: '8px' }}>
          Confirm Password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          onKeyDown={(e) => e.key === 'Enter' && handleReset()}
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
          onClick={handleReset}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #c9a84c, #e3c47e)',
            color: '#0a0f1e', border: 'none',
            borderRadius: '10px', fontWeight: 700,
            fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer',
            marginTop: '8px', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  )
}
