'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import MatterCard from './MatterCard';
import AddMatterModal from './AddMatterModal';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { Matter } from '../lib/types';

export default function MattersPage() {
  const { session } = useApp();
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Closed' | 'Archived'>('All');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchMatters = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('matters')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (data) setMatters(data as Matter[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatters();
  }, [session?.user?.id]);

  const filteredMatters = matters.filter(m => {
    if (activeTab === 'All') return true;
    return m.status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-navy pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-3xl text-cream">My Matters</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            + New Matter
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto hide-scrollbar">
          {['All', 'Active', 'Closed', 'Archived'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-gold text-gold' 
                  : 'border-transparent text-cream/50 hover:text-cream/80'
              }`}
            >
              {tab === 'All' ? 'All Matters' : tab}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-cream/50">Loading matters...</div>
        ) : filteredMatters.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-cream/50 mb-6">No matters found. Start by adding your first case matter.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-block"
            >
              Add Matter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatters.map(matter => (
              <MatterCard key={matter.id} matter={matter} />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddMatterModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchMatters}
        />
      )}
    </div>
  );
}
