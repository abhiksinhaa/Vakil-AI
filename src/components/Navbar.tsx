'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import NotificationBell from './NotificationBell';

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
        {/* Left: Hamburger → Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={openMenu}
            className="p-1.5 text-cream/80 hover:text-gold transition-colors"
            aria-label="Main menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Draftee" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
            <span className="text-cream font-medium text-lg tracking-wide">draftee.in</span>
          </Link>

          {/* Hamburger Drawer */}
          {menuOpen && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '280px',
                height: '100vh',
                background: '#0a0f1e',
                borderRight: '1px solid #1e2a3a',
                padding: '24px 20px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflowY: 'auto',
                boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
                pointerEvents: 'all',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: '#e8e0d0',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  padding: '4px 0',
                }}
              >
                ✕
              </button>

              {/* Nav links — use plain <a> tags, NOT Link component */}
              {[
                { href: '/generate', label: 'Create New Draft', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /> },
                { href: '/history',  label: 'Draft History', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                { href: '/profile',  label: 'My Profile', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
                { href: '/resources', label: 'Free Resources', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
                { href: '/help',     label: 'Help Center', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                { href: '/refer',    label: 'Refer & Earn', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                { href: '/pricing',  label: 'Unlock Premium', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /> },
              ].map(({ href, label, icon }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    color: '#e8e0d0',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {icon}
                  </svg>
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right: Search → Notifications → Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Search Icon Placeholder */}
          <button
            type="button"
            className="p-1.5 text-cream/70 hover:text-gold transition-colors shrink-0"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {session && <NotificationBell />}

          {/* Profile avatar dropdown */}
          <div className="relative shrink-0 ml-1">
            <button
              type="button"
              onClick={openProfile}
              className={`w-9 h-9 rounded-full bg-[#1e2a3a] text-cream flex items-center justify-center font-medium text-sm transition-all hover:bg-gold/20 hover:text-gold ${
                profileOpen ? 'bg-gold/20 text-gold' : ''
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
                  <button
                    type="button"
                    onClick={() => { toggleTheme(); closeAll(); }}
                    className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-cream/80 hover:bg-gold/10 hover:text-gold"
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-red-400 hover:bg-red-400/10"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeAll} className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-cream/80 hover:bg-gold/10 hover:text-gold">
                    Sign In
                  </Link>
                  <button
                    type="button"
                    onClick={() => { toggleTheme(); closeAll(); }}
                    className="block w-full text-left px-4 py-2.5 text-sm transition-colors text-cream/80 hover:bg-gold/10 hover:text-gold"
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </>
              )}
            </NavDropdown>
          </div>
        </div>
      </div>
    </nav>
  );
}
