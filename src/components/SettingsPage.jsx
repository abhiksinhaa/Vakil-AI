import Navbar from './Navbar';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { theme, toggleTheme, session } = useApp();

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl sm:text-3xl text-gold mb-6">Settings</h1>

        <section className="card space-y-4">
          <h2 className="font-display text-lg text-gold">Appearance</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-cream text-sm font-medium">Theme</p>
              <p className="text-cream/50 text-xs mt-0.5">
                Current: {theme === 'dark' ? 'Dark' : 'Light'}
              </p>
            </div>
            <button type="button" onClick={toggleTheme} className="btn-secondary text-sm">
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </section>

        <section className="card space-y-3 mt-6">
          <h2 className="font-display text-lg text-gold">Account</h2>
          <p className="text-sm text-cream/70">
            Signed in as{' '}
            <span className="text-cream">{session?.user?.email || '—'}</span>
          </p>
        </section>
      </div>
    </div>
  );
}
