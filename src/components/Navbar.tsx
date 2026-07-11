'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

function getUserInitials(session, profile) {
  const name =
    profile?.advocate_name?.trim() ||
    profile?.full_name?.trim() ||
    session?.user?.user_metadata?.full_name?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'A';
  const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function NavDropdown({ open, onClose, align = 'right', children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const toggleBtn = ref.current.previousElementSibling;
        if (toggleBtn && toggleBtn.contains(e.target as Node)) {
          return; // Ignore click on the toggle button itself
        }
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      className={`absolute top-full mt-2 min-w-[200px] py-1.5 rounded-xl border border-border bg-card shadow-xl z-[60] transition-all duration-200 ${
        align === 'right' ? 'right-0' : 'left-0'
      } ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      role="menu"
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, isPro, session, profile } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = getUserInitials(session, profile);

  const closeAll = () => {
    setProfileOpen(false);
    setMenuOpen(false);
  };

  const openProfile = () => {
    setMenuOpen(false);
    setProfileOpen((o) => !o);
  };

  const openMenu = () => {
    setProfileOpen(false);
    setMenuOpen((o) => !o);
  };

  const handleLogout = async () => {
    closeAll();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('draftee_profile_complete');
      window.localStorage.removeItem('draftee_user_id');
    }
    await supabase.auth.signOut();
    router.replace('/');
  };

  useEffect(() => {
    closeAll();
  }, [pathname]);

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo"
            alt="Draftee"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {/* Right: theme → profile → hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border text-cream/70 hover:border-gold/40 hover:text-gold transition-colors shrink-0"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* 2. Profile avatar dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={openProfile}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all ${
                profileOpen
                  ? 'border-gold bg-gold/20 text-gold'
                  : 'border-gold/60 bg-gold/10 text-gold hover:border-gold hover:bg-gold/20'
              }`}
              aria-label="Profile menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              {initials}
            </button>

            <NavDropdown open={profileOpen} onClose={() => setProfileOpen(false)}>
              {session ? (
                <>
                  <Link href="/profile" onClick={closeAll} className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-cream/80 hover:bg-gold/10 hover:text-gold">
                    My Profile
                  </Link>
                  <Link href="/settings" onClick={closeAll} className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-cream/80 hover:bg-gold/10 hover:text-gold">
                    Settings
                  </Link>
                </>
              ) : (
                <Link href="/login" onClick={closeAll} className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-cream/80 hover:bg-gold/10 hover:text-gold">
                  Sign In / Sign Up
                </Link>
              )}
            </NavDropdown>
          </div>

          {/* 3. Hamburger menu dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={openMenu}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                menuOpen
                  ? 'border-gold text-gold bg-gold/10'
                  : 'border-border text-cream/70 hover:border-gold/40 hover:text-gold'
              }`}
              aria-label="Main menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  width: '260px',
                  height: '100vh',
                  background: '#0a0f1e',
                  borderLeft: '1px solid #1e2a3a',
                  padding: '24px 20px',
                  zIndex: 99999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  overflowY: 'auto',
                  boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
                  pointerEvents: 'all',
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setMenuOpen(false)}
                  style={{
                    alignSelf: 'flex-end',
                    background: 'none',
                    border: 'none',
                    color: '#e8e0d0',
                    fontSize: '1.4rem',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    padding: '4px 8px',
                  }}
                >
                  ✕
                </button>

                {/* Nav links — use plain <a> tags, NOT Link component */}
                {[
                  { href: '/generate', label: '📝  Create New Draft' },
                  { href: '/history',  label: '📂  Draft History' },
                  { href: '/profile',  label: '👤  My Profile' },
                  { href: '/help',     label: '❓  Help Center' },
                  { href: '/refer',    label: '🎁  Refer & Earn' },
                  { href: '/pricing',  label: '⭐  Unlock Premium' },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      color: '#e8e0d0',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      borderBottom: '1px solid #1e2a3a',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
