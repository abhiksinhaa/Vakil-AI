'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import type { Matter } from '../lib/types';

interface AddTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedMatterId?: string;
}

export default function AddTaskModal({ onClose, onSuccess, preselectedMatterId }: AddTaskModalProps) {
  const { session } = useApp();
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState<Matter[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    matter_id: preselectedMatterId || '',
    due_date: '',
    priority: 'normal',
  });

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('matters')
      .select('id, title')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setMatters(data as Matter[]);
      });
  }, [session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    if (!formData.title.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('tasks').insert([{
      user_id: session.user.id,
      title: formData.title,
      matter_id: formData.matter_id || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      status: 'pending'
    }]);

    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Error creating task: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-cream/50 hover:text-cream text-2xl leading-none"
        >
          &times;
        </button>
        
        <h2 className="font-display text-2xl text-gold mb-6">Add New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-1">Task Title *</label>
            <input 
              required
              type="text" 
              className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-1">Link to Matter</label>
            <select 
              className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
              value={formData.matter_id}
              onChange={e => setFormData({ ...formData, matter_id: e.target.value })}
            >
              <option value="">None (General Task)</option>
              {matters.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-1">Due Date</label>
              <input 
                type="date" 
                className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none [color-scheme:dark]"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-1">Priority</label>
              <select 
                className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-semibold text-cream border border-border hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
