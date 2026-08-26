'use client';

import type { Task, Matter } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface TaskItemProps {
  task: Task;
  matter?: Matter;
  onUpdate?: () => void;
}

function getDueDateColor(dueDate?: string) {
  if (!dueDate) return 'text-cream/50';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due.getTime() === today.getTime()) return 'text-gold';
  if (due.getTime() === tomorrow.getTime()) return 'text-orange-500';
  if (due.getTime() < today.getTime()) return 'text-danger';
  return 'text-cream/50';
}

function formatDueDate(dueDate?: string) {
  if (!dueDate) return 'No due date';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due.getTime() === today.getTime()) return 'Today';
  if (due.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (due.getTime() < today.getTime()) return 'Overdue';
  
  return due.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short'
  });
}

export default function TaskItem({ task, matter, onUpdate }: TaskItemProps) {
  const [loading, setLoading] = useState(false);
  const isCompleted = task.status === 'completed';

  const toggleStatus = async () => {
    if (loading) return;
    setLoading(true);
    const newStatus = isCompleted ? 'pending' : 'completed';
    
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
      
    setLoading(false);
    if (onUpdate) onUpdate();
  };

  const dueColor = isCompleted ? 'text-cream/30' : getDueDateColor(task.due_date);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${isCompleted ? 'border-border/50 bg-card/50' : 'border-border bg-card'}`}>
      <button 
        type="button" 
        onClick={toggleStatus}
        disabled={loading}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
          isCompleted ? 'bg-gold/20 border-gold/40 text-gold' : 'border-border hover:border-gold/50'
        }`}
      >
        {isCompleted && (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold text-base truncate ${isCompleted ? 'line-through text-cream/40' : 'text-cream'}`}>
          {task.title}
        </h4>
        {matter && (
          <p className="text-xs text-cream/50 truncate mt-0.5">{matter.title}</p>
        )}
      </div>
      
      <div className={`text-xs font-medium shrink-0 ${dueColor}`}>
        {formatDueDate(task.due_date)}
      </div>
    </div>
  );
}
