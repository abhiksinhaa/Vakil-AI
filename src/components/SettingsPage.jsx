import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import TermsContent from './TermsContent';
import PrivacyContent from './PrivacyContent';

export default function SettingsPage() {
  const { theme, toggleTheme, session } = useApp();
  const [modalContent, setModalContent] = useState(null);

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

        <section className="card space-y-3 mt-6">
          <h2 className="font-display text-lg text-gold">Support</h2>
          <div className="flex flex-col gap-2">
            <Link 
              to="/help"
              className="w-full text-left px-4 py-3 bg-navy/50 border border-border rounded-lg hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm flex justify-between items-center"
            >
              <span>Help Center</span>
              <svg className="w-4 h-4 text-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        <section className="card space-y-3 mt-6">
          <h2 className="font-display text-lg text-gold">Legal</h2>
          <div className="flex flex-col gap-2">
            <button 
              type="button" 
              onClick={() => setModalContent('terms')}
              className="w-full text-left px-4 py-3 bg-navy/50 border border-border rounded-lg hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm flex justify-between items-center"
            >
              <span>Terms of Use</span>
              <svg className="w-4 h-4 text-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button 
              type="button" 
              onClick={() => setModalContent('privacy')}
              className="w-full text-left px-4 py-3 bg-navy/50 border border-border rounded-lg hover:border-gold/40 hover:text-gold transition-colors text-cream text-sm flex justify-between items-center"
            >
              <span>Privacy Policy</span>
              <svg className="w-4 h-4 text-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </div>

      {modalContent && (
        <div className="fixed inset-0 z-[100] bg-navy flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <h2 className="font-display text-xl text-gold">
              {modalContent === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
            </h2>
            <button
              onClick={() => setModalContent(null)}
              className="p-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-3xl mx-auto bg-card rounded-xl border border-border p-6 sm:p-8">
              {modalContent === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
