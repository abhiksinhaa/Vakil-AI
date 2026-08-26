'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from './Navbar';
import TaskItem from './TaskItem';
import DraftItem from './DraftItem';
import AddTaskModal from './AddTaskModal';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { Matter, Task, DraftRecord, Hearing } from '../lib/types';
import { getMatterColor } from './MatterCard';
import { stripMarkdown } from '../lib/stripMarkdown';

interface MatterDetailPageProps {
  id: string;
}

function DraftModal({ draft, onClose }: { draft: DraftRecord | null, onClose: () => void }) {
  if (!draft) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm" onClick={onClose}>
      <div className="card max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <h3 className="font-display text-lg text-gold">{draft.draft_type}</h3>
            <p className="text-sm text-cream/50 mt-1">
              {new Date(draft.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-2xl leading-none">&times;</button>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap text-sm text-cream/90 leading-relaxed">
          {stripMarkdown(draft.generated_draft)}
        </pre>
      </div>
    </div>
  );
}

export default function MatterDetailPage({ id }: MatterDetailPageProps) {
  const router = useRouter();
  const { session } = useApp();
  const [matter, setMatter] = useState<Matter | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Documents' | 'Tasks' | 'Hearings'>('Documents');
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    
    // Fetch matter
    const { data: mData } = await supabase
      .from('matters')
      .select('*')
      .eq('id', id)
      .single();
    if (mData) setMatter(mData as Matter);
    
    // Fetch tasks
    const { data: tData } = await supabase
      .from('tasks')
      .select('*')
      .eq('matter_id', id)
      .order('due_date', { ascending: true });
    if (tData) setTasks(tData as Task[]);

    // Fetch drafts
    const { data: dData } = await supabase
      .from('drafts')
      .select('*')
      .eq('matter_id', id)
      .order('created_at', { ascending: false });
    if (dData) setDrafts(dData as unknown as DraftRecord[]);

    // Fetch hearings
    const { data: hData } = await supabase
      .from('hearings')
      .select('*')
      .eq('matter_id', id)
      .order('hearing_date', { ascending: true });
    if (hData) setHearings(hData as Hearing[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, session?.user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy pb-24">
        <Navbar />
        <div className="text-center py-20 text-cream/50">Loading matter details...</div>
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="min-h-screen bg-navy pb-24">
        <Navbar />
        <div className="text-center py-20 text-cream/50">Matter not found.</div>
      </div>
    );
  }

  const color = getMatterColor(matter.case_type);

  return (
    <div className="min-h-screen bg-navy pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8 relative pl-6">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <div className="flex items-center gap-3 mb-2">
            <button 
              onClick={() => router.back()}
              className="text-cream/50 hover:text-gold transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="font-display text-2xl sm:text-3xl text-cream">{matter.title}</h1>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/60 ml-9">
            {matter.case_type && <span>Case Type: <span className="text-cream/90">{matter.case_type}</span></span>}
            {matter.court_name && <span>Court: <span className="text-cream/90">{matter.court_name}</span></span>}
            {matter.case_number && <span>Case No: <span className="text-cream/90">{matter.case_number}</span></span>}
            {matter.opposite_party && <span>Vs: <span className="text-cream/90">{matter.opposite_party}</span></span>}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {['Documents', 'Tasks', 'Hearings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-gold text-gold' 
                  : 'border-transparent text-cream/50 hover:text-cream/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {activeTab === 'Documents' && (
            <div>
              <div className="flex justify-end mb-4">
                {/* Note: since generate doesn't yet natively support taking a matter_id via URL params, we just link to it. */}
                <Link href={`/generate?matter_id=${matter.id}`} className="btn-primary text-sm">
                  + Add Document
                </Link>
              </div>
              {drafts.length === 0 ? (
                <div className="card text-center py-12 text-cream/50">
                  No documents linked to this matter.
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map(draft => (
                    <DraftItem 
                      key={draft.id} 
                      draft={draft} 
                      onView={setSelectedDraft}
                      onDeleted={fetchData}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Tasks' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAddTask(true)} className="btn-primary text-sm">
                  + Add Task
                </button>
              </div>
              {tasks.length === 0 ? (
                <div className="card text-center py-12 text-cream/50">
                  No tasks for this matter.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <TaskItem key={task.id} task={task} onUpdate={fetchData} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Hearings' && (
            <div>
              <div className="flex justify-end mb-4">
                <button className="btn-primary text-sm opacity-50 cursor-not-allowed" title="Coming Soon">
                  + Add Hearing
                </button>
              </div>
              {hearings.length === 0 ? (
                <div className="card text-center py-12 text-cream/50">
                  No hearings scheduled.
                </div>
              ) : (
                <div className="space-y-3">
                  {hearings.map(hearing => (
                    <div key={hearing.id} className="card flex justify-between items-center p-4">
                      <div>
                        <div className="font-semibold text-cream">
                          {new Date(hearing.hearing_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-cream/60 mt-1">{hearing.court_name || 'No court specified'}</div>
                        {hearing.notes && <div className="text-sm text-cream/40 mt-1">{hearing.notes}</div>}
                      </div>
                      <div className="text-gold font-medium uppercase text-xs tracking-wider">
                        {hearing.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showAddTask && (
        <AddTaskModal 
          preselectedMatterId={matter.id}
          onClose={() => setShowAddTask(false)}
          onSuccess={fetchData}
        />
      )}
      
      <DraftModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
    </div>
  );
}
