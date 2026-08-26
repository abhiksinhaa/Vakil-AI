'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import TaskItem from './TaskItem';
import AddTaskModal from './AddTaskModal';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { Task, Matter } from '../lib/types';

export default function TasksPage() {
  const { session } = useApp();
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Completed'>('Pending');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mattersMap, setMattersMap] = useState<Record<string, Matter>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    
    // Fetch matters for mapping
    const { data: mData } = await supabase
      .from('matters')
      .select('id, title, case_type')
      .eq('user_id', session.user.id);
      
    const mmap: Record<string, Matter> = {};
    if (mData) {
      mData.forEach((m: any) => mmap[m.id] = m);
    }
    setMattersMap(mmap);

    // Fetch tasks
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true, nullsFirst: false });
    
    if (data) setTasks(data as Task[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.id]);

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'All') return true;
    return t.status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-navy pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-3xl text-cream">My Tasks</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            + Add Task
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {['All', 'Pending', 'Completed'].map(tab => (
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

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-cream/50">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-cream/50 mb-6">No tasks found in this view.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-block"
            >
              Add Task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                matter={task.matter_id ? mattersMap[task.matter_id] : undefined}
                onUpdate={fetchData}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddTaskModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
