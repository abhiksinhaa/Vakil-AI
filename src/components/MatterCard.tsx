import Link from 'next/link';
import type { Matter } from '../lib/types';

export function getMatterColor(caseType?: string) {
  const type = caseType?.toLowerCase() || '';
  if (type.includes('civil')) return '#7C3AED'; // Purple
  if (type.includes('criminal')) return '#DC2626'; // Red
  if (type.includes('family')) return '#DB2777'; // Pink
  if (type.includes('consumer')) return '#059669'; // Green
  if (type.includes('property')) return '#D97706'; // Orange
  if (type.includes('employment')) return '#2563EB'; // Blue
  return '#c9a84c'; // fallback gold
}

interface MatterCardProps {
  matter: Matter;
  draftCount?: number;
}

export default function MatterCard({ matter, draftCount = 0 }: MatterCardProps) {
  const color = getMatterColor(matter.case_type);

  return (
    <Link href={`/matters/${matter.id}`} className="block group">
      <div 
        style={{ 
          background: '#0f1525', 
          border: '1px solid #1e2a3a', 
          borderRadius: '10px', 
          padding: '16px' 
        }} 
        className="group-hover:border-gold/40 transition-colors flex items-center justify-between gap-4"
      >
        <div className="flex gap-4 items-center">
          {/* Case Icon with category color */}
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
          </div>
          
          <div className="flex flex-col">
            <h3 className="font-semibold text-cream text-base leading-tight">{matter.title}</h3>
            <p className="text-xs text-cream/50 mt-1">{matter.case_type || 'General Matter'}</p>
            
            {matter.next_hearing_date && (
              <p className="text-xs text-gold/80 mt-1.5 font-medium flex items-center gap-1.5">
                Next Hearing: {new Date(matter.next_hearing_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          {draftCount > 0 ? (
            <div className="text-xs font-medium text-cream/70 text-right">
              <span className="text-cream block mb-0.5">{draftCount}</span>
              Docs
            </div>
          ) : (
            <div className="text-xs font-medium text-cream/40 text-right">
              0 Docs
            </div>
          )}
          <span className="text-gold group-hover:translate-x-1 transition-transform mt-1">›</span>
        </div>
      </div>
    </Link>
  );
}
