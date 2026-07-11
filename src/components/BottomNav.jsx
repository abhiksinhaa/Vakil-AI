'use client'

import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const publicPaths = ['/', '/login', '/signup']
  
  if (publicPaths.includes(pathname)) return null

  const tabs = [
    {
      href: '/dashboard',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#c9a84c' : 'none'}
          stroke={active ? '#c9a84c' : 'currentColor'} strokeWidth="2">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
          <path d="M9 21V12h6v9"/>
        </svg>
      ),
    },
    {
      href: '/pricing',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#c9a84c' : 'none'}
          stroke={active ? '#c9a84c' : 'currentColor'} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
    },
    {
      href: '/generate',
      icon: (_active) => (
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #e3c47e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(201,168,76,0.5)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#0a0f1e" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      ),
    },
    {
      href: '/profile',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#c9a84c' : 'none'}
          stroke={active ? '#c9a84c' : 'currentColor'} strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      <div style={{ height: '70px' }} className="bottom-nav-spacer" />

      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '64px',
        background: '#0a0f1e',
        borderTop: '1px solid #1e2a3a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 99999,
        paddingBottom: 'env(safe-area-inset-bottom)',
        pointerEvents: 'all',
      }}>
        {tabs.map(({ href, icon }) => {
          const active = pathname === href
          return (
            <a
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: active ? '#c9a84c' : '#6b7280',
                textDecoration: 'none',
                flex: 1,
                height: '100%',
                pointerEvents: 'all',
                cursor: 'pointer',
              }}
            >
              {icon(active)}
            </a>
          )
        })}
      </nav>
    </>
  )
}
