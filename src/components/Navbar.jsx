import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const linkClass = (path) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'text-gold'
        : 'text-cream/70 hover:text-gold'
    }`;

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-xl font-semibold text-gold tracking-tight">
            Vakil<span className="text-cream">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/generate" className="btn-primary text-sm py-2 px-4 hidden sm:inline-flex">
            Naya Draft
          </Link>
          <Link to="/generate" className="btn-primary text-xs py-1.5 px-3 sm:hidden">
            + Draft
          </Link>
          <Link to="/history" className={linkClass('/history')}>
            History
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-cream/60 hover:text-cream transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
