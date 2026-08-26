'use client';

import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { useApp } from '../context/AppContext';
import { createClient } from '../lib/supabase';
import { startCheckout } from '../lib/razorpay';
import { Users, Trash2, Mail, Plus } from 'lucide-react';

interface OrgMember {
  id: string;
  user_id: string | null;
  invited_email: string;
  role: string;
  status: string;
  drafts_this_month: number;
}

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  seats_total: number;
  drafts_limit: number;
  plan_expires_at: string;
}

export default function FirmAdminPage() {
  const { session, profile, refreshAccount } = useApp();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalDrafts, setTotalDrafts] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (session?.user && profile) {
      fetchOrgData();
    }
  }, [session?.user, profile]);

  const fetchOrgData = async () => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();
      
      if (orgData) setOrg(orgData);

      const { data: membersData } = await supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', profile.org_id)
        .neq('status', 'inactive');

      if (membersData) {
        // Fetch drafts for each active member
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const enrichedMembers = await Promise.all(membersData.map(async (m: any) => {
          let drafts = 0;
          if (m.user_id) {
            const { count } = await supabase
              .from('drafts')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', m.user_id)
              .gte('created_at', startOfMonth.toISOString());
            drafts = count || 0;
          }
          return { ...m, drafts_this_month: drafts };
        }));

        setMembers(enrichedMembers);
        setTotalDrafts(enrichedMembers.reduce((acc, m) => acc + m.drafts_this_month, 0));
      }
    } catch (err) {
      console.error('Failed to fetch org data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !org) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          orgId: org.id,
          userId: session?.user?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setInviteEmail('');
      await fetchOrgData();
      alert('Invitation sent successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to invite member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!org) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/org/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          orgId: org.id,
          userId: session?.user?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await fetchOrgData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuySeat = async () => {
    if (!session?.user?.id) return;
    
    setActionLoading(true);
    try {
      await startCheckout({
        plan: 'firm_seat',
        billingCycle: 'monthly',
        userId: session.user.id,
        userEmail: session.user.email,
        userName: profile?.full_name || session.user.email,
        onSuccess: async () => {
          await fetchOrgData();
          alert('Seat purchased successfully!');
        }
      });
    } catch (err: any) {
      alert(err.message || 'Failed to purchase seat');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#020b14]"><Navbar /><div className="p-8 text-cream">Loading...</div></div>;
  }

  if (!org || org.owner_id !== session?.user?.id) {
    return (
      <div className="min-h-screen bg-[#020b14] flex flex-col">
        <Navbar />
        <div className="p-8 text-center mt-20">
          <h2 className="text-2xl font-display text-cream mb-4">Firm Administration</h2>
          <p className="text-cream/70 mb-6">You must be the owner of a Firm plan to access this dashboard.</p>
          <a href="/pricing" className="btn-primary">View Pricing</a>
        </div>
      </div>
    );
  }

  const seatsUsed = members.length;

  return (
    <div className="min-h-screen bg-[#020b14] flex flex-col relative">
      <Navbar />
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 relative z-10 mt-16">
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-cream mb-2">{org.name} Dashboard</h1>
            <p className="text-cream/70">Manage your team members and view pooled draft usage.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6 border border-gold/30 bg-[#07111f]">
            <h3 className="text-lg font-semibold text-gold mb-2">Pooled Drafts (This Month)</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-cream">{totalDrafts}</span>
              <span className="text-cream/50 mb-1">/ {org.drafts_limit} used</span>
            </div>
            <div className="w-full bg-navy/50 rounded-full h-2.5 mt-4">
              <div 
                className="bg-gold h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, (totalDrafts / org.drafts_limit) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="card p-6 border border-gold/30 bg-[#07111f]">
            <h3 className="text-lg font-semibold text-gold mb-2">Team Seats</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-cream">{seatsUsed}</span>
              <span className="text-cream/50 mb-1">/ {org.seats_total} used</span>
            </div>
            <button 
              onClick={handleBuySeat} 
              disabled={actionLoading}
              className="mt-4 w-full py-2 rounded-xl bg-gold/10 text-gold border border-gold/30 hover:bg-gold hover:text-[#020b14] transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Buy Extra Seat (₹299)
            </button>
          </div>
        </div>

        <div className="card p-6 mb-8 border border-border">
          <h3 className="text-lg font-semibold text-cream mb-4">Invite Member</h3>
          <form onSubmit={handleInvite} className="flex gap-4">
            <input 
              type="email" 
              placeholder="colleague@firm.com" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              required
            />
            <button 
              type="submit" 
              disabled={actionLoading || seatsUsed >= org.seats_total}
              className="btn-primary flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> Send Invite
            </button>
          </form>
          {seatsUsed >= org.seats_total && (
            <p className="text-red-400 text-sm mt-2">You have reached your seat limit. Please buy an extra seat to invite more members.</p>
          )}
        </div>

        <div className="card p-6 border border-border">
          <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" /> Firm Members
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-cream/80">
              <thead className="border-b border-border text-cream/50 uppercase">
                <tr>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Drafts (Month)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{member.invited_email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize">{member.role}</td>
                    <td className="py-3 px-4">{member.drafts_this_month}</td>
                    <td className="py-3 px-4 text-right">
                      {member.role !== 'admin' && (
                        <button 
                          onClick={() => handleRemove(member.id)}
                          disabled={actionLoading}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
