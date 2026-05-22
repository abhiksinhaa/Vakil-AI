import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme, isPro } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const linkClass = (path) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'text-gold'
        : 'text-cream/70 hover:text-gold'
    }`;

  const navLinks = (
    <>
      <Link to="/generate" className={linkClass('/generate')} onClick={() => setMenuOpen(false)}>
        Naya Draft
      </Link>
      <Link to="/history" className={linkClass('/history')} onClick={() => setMenuOpen(false)}>
        History
      </Link>
      <Link to="/profile" className={linkClass('/profile')} onClick={() => setMenuOpen(false)}>
        Profile
      </Link>
      <Link to="/pricing" className={linkClass('/pricing')} onClick={() => setMenuOpen(false)}>
        {isPro ? 'Pro ✓' : 'Pricing'}
      </Link>
    </>
  );

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-xl font-semibold text-gold tracking-tight">
            Draft<span className="text-cream">ee</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          <Link to="/generate" className="btn-primary text-sm py-2 px-4">
            + Draft
          </Link>
          {navLinks}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border text-cream/70 hover:border-gold/40 hover:text-gold transition-colors"
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

          <button
            type="button"
            className="md:hidden p-2 text-cream/70"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden sm:inline text-sm text-cream/60 hover:text-cream transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 flex flex-col gap-3">
          <Link to="/generate" className="btn-primary text-sm text-center" onClick={() => setMenuOpen(false)}>
            + Naya Draft
          </Link>
          {navLinks}
          <button type="button" onClick={handleLogout} className="text-sm text-cream/60 text-left">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
