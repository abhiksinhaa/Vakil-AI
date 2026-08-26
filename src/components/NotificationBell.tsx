'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

interface Notification {
  id: string;
  title: string;
  type: 'task' | 'hearing';
  date: string;
  isRead: boolean;
}

function NavDropdown({ open, onClose, align = 'right', children }: any) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const toggleBtn = ref.current.previousElementSibling;
        if (toggleBtn && toggleBtn.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      className={`absolute top-full mt-2 w-72 max-w-[calc(100vw-2rem)] py-2 rounded-xl border border-border bg-card shadow-xl z-[60] transition-all duration-200 ${
        align === 'right' ? 'right-0' : 'left-0'
      } ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      role="menu"
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

export default function NotificationBell() {
  const { session } = useApp();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('draftee_read_notifications');
      if (stored) {
        try {
          setReadIds(new Set(JSON.parse(stored)));
        } catch (e) {}
      }
    }
  }, []);

  const saveReadIds = (ids: Set<string>) => {
    setReadIds(ids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('draftee_read_notifications', JSON.stringify(Array.from(ids)));
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchNotifications = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Fetch tasks due today or tomorrow
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('user_id', session.user.id)
        .eq('status', 'pending')
        .in('due_date', [todayStr, tomorrowStr]);

      // Fetch hearings today or tomorrow
      const { data: hearingsData } = await supabase
        .from('hearings')
        .select('id, court_name, hearing_date')
        .eq('user_id', session.user.id)
        .in('hearing_date', [todayStr, tomorrowStr]);

      const notifs: Notification[] = [];

      (tasksData || []).forEach(task => {
        notifs.push({
          id: `task-${task.id}`,
          title: `Task due: ${task.title}`,
          type: 'task',
          date: task.due_date,
          isRead: readIds.has(`task-${task.id}`),
        });
      });

      (hearingsData || []).forEach(hearing => {
        notifs.push({
          id: `hearing-${hearing.id}`,
          title: `Hearing: ${hearing.court_name || 'Court'}`,
          type: 'hearing',
          date: hearing.hearing_date,
          isRead: readIds.has(`hearing-${hearing.id}`),
        });
      });

      notifs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setNotifications(notifs.slice(0, 5));
    };

    fetchNotifications();
    // In a real app we might set up a realtime subscription or poll, but fetching on mount is fine for now.
  }, [session?.user?.id, readIds]); // Added readIds to dep array to keep isRead in sync, but it might cause re-fetch. Better to just update state.

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const newReadIds = new Set(readIds);
    notifications.forEach(n => newReadIds.add(n.id));
    saveReadIds(newReadIds);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg border border-border text-cream/70 hover:border-gold/40 hover:text-gold transition-colors relative"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-danger"></span>
        )}
      </button>

      <NavDropdown open={open} onClose={() => setOpen(false)}>
        <div className="px-4 py-2 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold text-cream">Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-gold hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-cream/50">
              No new notifications
            </div>
          ) : (
            notifications.map(n => {
              const isUnread = !readIds.has(n.id);
              return (
                <div key={n.id} className={`px-4 py-3 border-b border-border/50 last:border-0 ${isUnread ? 'bg-gold/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {n.type === 'task' ? '📋' : '⚖️'}
                    </div>
                    <div>
                      <p className={`text-sm ${isUnread ? 'font-medium text-cream' : 'text-cream/70'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-cream/40 mt-1">
                        {n.date}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </NavDropdown>
    </div>
  );
}
