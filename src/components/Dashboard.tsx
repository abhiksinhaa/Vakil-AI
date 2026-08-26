'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from './Navbar';
import CourtNewsCarousel from './CourtNewsCarousel';
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
  const { session } = useApp();
  
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
    setShowPaymentSuccess(true);
    const timer = window.setTimeout(() => setShowPaymentSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [paymentSuccess]);

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
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl text-cream mb-2">
            {getGreetingTime()}, {displayName} 👋
          </h1>
          <p className="text-cream/50 text-sm">
            Let's get your legal work done.
          </p>
        </header>

        {/* Stats Cards Row */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          <Link href="/tasks" className="shrink-0 group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '120px' }} className="group-hover:border-gold/40 transition-colors">
              <div className="text-2xl font-bold text-gold mb-1">{pendingTasksCount}</div>
              <div className="text-xs text-cream/50 font-medium uppercase tracking-wider">My Tasks</div>
            </div>
          </Link>
          <Link href="/matters" className="shrink-0 group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '120px' }} className="group-hover:border-gold/40 transition-colors">
              <div className="text-2xl font-bold text-gold mb-1">{hearingsCount}</div>
              <div className="text-xs text-cream/50 font-medium uppercase tracking-wider">Hearings</div>
            </div>
          </Link>
          <Link href="/library" className="shrink-0 group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '120px' }} className="group-hover:border-gold/40 transition-colors">
              <div className="text-2xl font-bold text-gold mb-1">{draftsCount}</div>
              <div className="text-xs text-cream/50 font-medium uppercase tracking-wider">Recent Drafts</div>
            </div>
          </Link>
          <Link href="/tasks" className="shrink-0 group">
            <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', minWidth: '120px' }} className="group-hover:border-gold/40 transition-colors">
              <div className="text-2xl font-bold text-gold mb-1">{deadlinesCount}</div>
              <div className="text-xs text-cream/50 font-medium uppercase tracking-wider">Deadlines</div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <section>
            <h2 className="font-display text-xl text-cream mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/generate" className="block group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📝</span>
                    <span className="text-cream font-medium text-sm">Create Draft</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </Link>
              
              <Link href="/generate" className="block group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <span className="text-cream font-medium text-sm">Upload Document</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </Link>
              
              <button onClick={() => setShowAddTask(true)} className="w-full text-left group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✓</span>
                    <span className="text-cream font-medium text-sm">Add Task</span>
                  </div>
                  <span className="text-gold group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </button>
              
              <button onClick={() => setShowNoteInput(!showNoteInput)} className="w-full text-left group">
                <div style={{ background: '#0f1525', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="group-hover:border-gold/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📌</span>
                    <span className="text-cream font-medium text-sm">Add Note</span>
                  </div>
                  <span className={`text-gold transition-transform ${showNoteInput ? 'rotate-90' : ''}`}>›</span>
                </div>
              </button>
              
              {showNoteInput && (
                <div className="mt-2 p-3 bg-navy border border-border rounded-lg flex gap-2">
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

          {/* My Matters */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-cream">My Matters</h2>
              <Link href="/matters" className="text-sm text-gold hover:underline">
                View all
              </Link>
            </div>
            
            <div className="space-y-3">
              {matters.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-cream/50 text-sm mb-4">No matters yet. Add your first matter.</p>
                  <Link href="/matters" className="btn-primary text-sm inline-block">
                    Add Matter
                  </Link>
                </div>
              ) : (
                matters.map((matter) => (
                  <MatterCard key={matter.id} matter={matter} />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Existing Carousel (optional but preserving it) */}
        <div className="mt-12">
          <CourtNewsCarousel />
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
