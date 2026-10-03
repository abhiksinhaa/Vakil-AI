'use client'

import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const publicPaths = ['/', '/login', '/signup']
  
  if (publicPaths.includes(pathname)) return null

  const tabs = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z"></path>
          <path stroke={active ? '#0a0f1e' : 'currentColor'} strokeWidth={active ? "2" : "1.8"} d="M9 21V12h6v9"></path>
        </svg>
      ),
    },
    {
      href: '/matters',
      label: 'Matters',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path stroke={active ? 'currentColor' : 'currentColor'} strokeWidth={active ? "1.8" : "1.8"} d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      ),
    },
    {
      href: '/generate',
      label: '', // Create button is special, no label or just visually distinct
      isPrimary: true,
      icon: (_active) => (
        <div style={{
          width: '46px', height: '46px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #e3c47e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
          marginTop: '-24px', // elevate above the nav bar
          border: '4px solid #0a0f1e' // match nav background to create cutout effect
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="#0a0f1e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      ),
    },
    {
      href: '/pricing',
      label: 'Premium',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ),
    },
    {
      href: '/library',
      label: 'Library',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      ),
    },
  ]

  return (
    <>
      <div style={{ height: '70px' }} className="bottom-nav-spacer sm:hidden" />

      <nav className="sm:hidden" style={{
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
        {tabs.map(({ href, icon, label, isPrimary }) => {
          const active = pathname === href
          return (
            <a
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: active ? '#c9a84c' : '#6b7280',
                textDecoration: 'none',
                flex: 1,
                height: '100%',
                pointerEvents: 'all',
                cursor: 'pointer',
                paddingTop: isPrimary ? '0' : '4px',
              }}
            >
              {icon(active)}
              {label && (
                <span style={{
                  fontSize: '10px',
                  marginTop: '4px',
                  fontWeight: active ? '600' : '500',
                }}>
                  {label}
                </span>
              )}
            </a>
          )
        })}
      </nav>
    </>
  )
}
