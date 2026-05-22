import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AppProvider } from './context/AppContext';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import DraftGenerator from './components/DraftGenerator';
import DraftHistory from './components/DraftHistory';
import ProfilePage from './components/ProfilePage';
import PricingPage from './components/PricingPage';
import SettingsPage from './components/SettingsPage';
import LegalChatbot from './components/LegalChatbot';

function ProtectedRoute({ children, session }) {
  const location = useLocation();
  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children, session }) {
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .catch((err) => {
        console.error('Auth session error:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-cream/60 text-sm">Loading Draftee…</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider session={session}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute session={session}>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/generate"
          element={
            <ProtectedRoute session={session}>
              <DraftGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute session={session}>
              <DraftHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute session={session}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute session={session}>
              <PricingPage session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute session={session}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
      </Routes>
      {session && <LegalChatbot />}
    </AppProvider>
  );
}
