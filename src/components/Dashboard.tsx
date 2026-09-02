'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from './Navbar';
import LegalInsightsCarousel from './LegalInsightsCarousel';
import { useApp } from '../context/AppContext';
import { createClient } from '../lib/supabase';
import type { Matter } from '../lib/types';
import MatterCard from './MatterCard';
import AddTaskModal from './AddTaskModal';

function getGreetingTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { session, refreshAccount } = useApp();
  
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [hearingsCount, setHearingsCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [deadlinesCount, setDeadlinesCount] = useState(0);
  const [matters, setMatters] = useState<Matter[]>([]);
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const paymentSuccess = searchParams.get('payment') === 'success';

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Advocate';

  useEffect(() => {
    if (!paymentSuccess) return;
    refreshAccount().catch((error) => console.error('Failed to refresh account after payment', error));
    setShowPaymentSuccess(true);
    const timer = window.setTimeout(() => setShowPaymentSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [paymentSuccess, refreshAccount]);

  const loadDashboardData = async () => {
    if (!session?.user?.id) return;
    const supabase = createClient();
    const userId = session.user.id;

    // Fetch active matters (limit 3)
    const { data: mattersData } = await supabase
      .from('matters')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3);
    if (mattersData) setMatters(mattersData as Matter[]);

    // Fetch counts
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (tasksCount !== null) setPendingTasksCount(tasksCount);

    const { count: dCount } = await supabase
      .from('drafts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (dCount !== null) setDraftsCount(dCount);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { count: hCount } = await supabase
      .from('hearings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('hearing_date', todayStr);
    if (hCount !== null) setHearingsCount(hCount);

    const { count: dlCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .in('due_date', [todayStr, tomorrowStr]);
    if (dlCount !== null) setDeadlinesCount(dlCount);
  };

  useEffect(() => {
    loadDashboardData();
  }, [session?.user?.id]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !session?.user?.id) return;
    setSavingNote(true);
    const supabase = createClient();
    await supabase.from('tasks').insert([{
      user_id: session.user.id,
      title: noteText,
      status: 'pending',
      priority: 'normal'
    }]);
    setNoteText('');
    setShowNoteInput(false);
    setSavingNote(false);
    loadDashboardData(); // Refresh tasks count
  };

  return (
    <div className="min-h-screen bg-navy pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {showPaymentSuccess ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
            🎉 Welcome to Premium! Your plan is now active.
          </div>
        ) : null}
        
        {/* Greeting Section */}
        <header className="mb-6 mt-2">
          <h1 className="font-display text-xl sm:text-2xl text-cream font-semibold tracking-tight">
            {getGreetingTime()}, {displayName} 👋
          </h1>
          <p className="text-cream/60 text-sm mt-1">
            Let's get your legal work done.
          </p>
        </header>

        {/* Stats Cards Row */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar snap-x">
          <Link href="/tasks" className="shrink-0 snap-start group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '140px' }} className="group-hover:border-gold/40 transition-colors">
              <svg className="w-5 h-5 text-gold mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-2xl font-bold text-cream mb-0.5">{pendingTasksCount}</div>
              <div className="text-sm text-cream/80 font-medium">My Tasks</div>
              <div className="text-xs text-gold mt-1 opacity-80">Pending</div>
            </div>
          </Link>
          <Link href="/matters" className="shrink-0 snap-start group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '140px' }} className="group-hover:border-blue-400/40 transition-colors">
              <svg className="w-5 h-5 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <div className="text-2xl font-bold text-cream mb-0.5">{hearingsCount}</div>
              <div className="text-sm text-cream/80 font-medium">Hearings</div>
              <div className="text-xs text-blue-400 mt-1 opacity-80">Today</div>
            </div>
          </Link>
          <Link href="/library" className="shrink-0 snap-start group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '140px' }} className="group-hover:border-emerald-500/40 transition-colors">
              <svg className="w-5 h-5 text-emerald-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              <div className="text-2xl font-bold text-cream mb-0.5">{draftsCount}</div>
              <div className="text-sm text-cream/80 font-medium">Recent Drafts</div>
              <div className="text-xs text-emerald-500 mt-1 opacity-80">Edited recently</div>
            </div>
          </Link>
          <Link href="/tasks" className="shrink-0 snap-start group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '140px' }} className="group-hover:border-red-400/40 transition-colors">
              <svg className="w-5 h-5 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-2xl font-bold text-cream mb-0.5">{deadlinesCount}</div>
              <div className="text-sm text-cream/80 font-medium">Deadlines</div>
              <div className="text-xs text-red-400 mt-1 opacity-80">Approaching</div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <section>
            <h2 className="font-display text-lg text-cream mb-3 font-semibold tracking-wide">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/generate" className="block group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className="text-cream font-medium text-sm">Create Draft</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </Link>
              
              <Link href="/upload" className="block group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span className="text-cream font-medium text-sm">Upload Document</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </Link>
              
              <button onClick={() => setShowAddTask(true)} className="w-full text-left group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-cream font-medium text-sm">Add Task</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </button>
              
              <button onClick={() => setShowNoteInput(!showNoteInput)} className="w-full text-left group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span className="text-cream font-medium text-sm">Add Note</span>
                  </div>
                  <span className={`text-gold transition-transform ${showNoteInput ? 'rotate-90' : ''}`}>›</span>
                </div>
              </button>

              <Link href="/research" className="block group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-cream font-medium text-sm">Ask Draftee AI</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </Link>
              
              {showNoteInput && (
                <div className="mt-2 p-3 bg-[#0a0f1e] border border-border rounded-lg flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a quick note..."
                    className="flex-1 bg-transparent text-sm text-cream outline-none"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                  />
                  <button 
                    disabled={savingNote || !noteText.trim()}
                    onClick={handleSaveNote}
                    className="text-gold text-sm font-medium hover:underline disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Legal Insights */}
          <section>
            <LegalInsightsCarousel />
          </section>
        </div>
      </main>

      {showAddTask && (
        <AddTaskModal 
          onClose={() => setShowAddTask(false)} 
          onSuccess={loadDashboardData}
        />
      )}
    </div>
  );
}
