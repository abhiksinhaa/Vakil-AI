import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
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

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute top-full mt-2 min-w-[200px] py-1.5 rounded-xl border border-border bg-card shadow-xl z-[60] ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
      role="menu"
    >
      {children}
    </div>
  );
}

function DropdownItem({ to, onClick, children, destructive }) {
  const className = `block w-full text-left px-4 py-2.5 text-sm transition-colors ${
    destructive
      ? 'text-red-400/90 hover:bg-red-400/10'
      : 'text-cream/80 hover:bg-gold/10 hover:text-gold'
  }`;

  if (to) {
    return (
      <Link to={to} role="menuitem" className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
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
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    closeAll();
  }, [location.pathname]);

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: logo */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-xl font-semibold text-gold tracking-tight">
            Draft<span className="text-cream">ee</span>
          </span>
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
              <DropdownItem
                to="/profile"
                onClick={closeAll}
              >
                My Profile
              </DropdownItem>
              <DropdownItem
                to="/settings"
                onClick={closeAll}
              >
                Settings
              </DropdownItem>
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

            <NavDropdown open={menuOpen} onClose={() => setMenuOpen(false)}>
              <DropdownItem
                to="/generate"
                onClick={closeAll}
              >
                New Draft
              </DropdownItem>
              <DropdownItem
                to="/history"
                onClick={closeAll}
              >
                History
              </DropdownItem>
              <DropdownItem
                to="/pricing"
                onClick={closeAll}
              >
                Unlock Premium Version
              </DropdownItem>
              <div className="my-1 border-t border-border" />
              <DropdownItem onClick={handleLogout} destructive>
                Logout
              </DropdownItem>
            </NavDropdown>
          </div>
        </div>
      </div>
    </nav>
  );
}
