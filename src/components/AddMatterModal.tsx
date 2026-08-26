'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

interface AddMatterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CASE_TYPES = [
  'Civil Suit', 'Criminal', 'Family', 'Consumer', 
  'Property', 'Employment', 'Commercial Suit', 'Writ Petition', 'Other'
];

export default function AddMatterModal({ onClose, onSuccess }: AddMatterModalProps) {
  const { session } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    case_type: 'Civil Suit',
    opposite_party: '',
    court_name: '',
    case_number: '',
    next_hearing_date: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    if (!formData.title.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('matters').insert([{
      user_id: session.user.id,
      title: formData.title,
      case_type: formData.case_type,
      opposite_party: formData.opposite_party || null,
      court_name: formData.court_name || null,
      case_number: formData.case_number || null,
      next_hearing_date: formData.next_hearing_date || null,
      description: formData.description || null,
    }]);

    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Error creating matter: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-lg my-8 relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-cream/50 hover:text-cream text-2xl leading-none"
        >
          &times;
        </button>
        
        <h2 className="font-display text-2xl text-gold mb-6">Add New Matter</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-1">Matter Title *</label>
            <input 
              required
              type="text" 
              className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
              placeholder="e.g. Sharma vs Gupta"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-1">Case Type</label>
            <select 
              className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
              value={formData.case_type}
              onChange={e => setFormData({ ...formData, case_type: e.target.value })}
            >
              {CASE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-1">Opposite Party</label>
              <input 
                type="text" 
                className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
                placeholder="Name"
                value={formData.opposite_party}
                onChange={e => setFormData({ ...formData, opposite_party: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-1">Court Name</label>
              <input 
                type="text" 
                className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
                placeholder="e.g. High Court"
                value={formData.court_name}
                onChange={e => setFormData({ ...formData, court_name: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-1">Case Number</label>
              <input 
                type="text" 
                className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
                placeholder="Optional"
                value={formData.case_number}
                onChange={e => setFormData({ ...formData, case_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-1">Next Hearing Date</label>
              <input 
                type="date" 
                className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none [color-scheme:dark]"
                value={formData.next_hearing_date}
                onChange={e => setFormData({ ...formData, next_hearing_date: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-1">Description</label>
            <textarea 
              className="w-full bg-navy border border-border rounded-lg px-4 py-2 text-cream focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none resize-none"
              rows={3}
              placeholder="Add some notes..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
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
              {loading ? 'Saving...' : 'Save Matter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
