import Link from 'next/link';
import type { Matter } from '../lib/types';

export function getMatterColor(caseType?: string) {
  const type = caseType?.toLowerCase() || '';
  if (type.includes('civil')) return '#7C3AED';
  if (type.includes('criminal')) return '#DC2626';
  if (type.includes('family')) return '#DB2777';
  if (type.includes('consumer')) return '#059669';
  if (type.includes('property')) return '#D97706';
  if (type.includes('employment')) return '#2563EB';
  return '#c9a84c'; // fallback gold
}

interface MatterCardProps {
  matter: Matter;
  draftCount?: number;
}

export default function MatterCard({ matter, draftCount = 0 }: MatterCardProps) {
  const color = getMatterColor(matter.case_type);

  return (
    <Link href={`/matters/${matter.id}`} className="block">
      <div className="card hover:border-gold/40 transition-colors relative overflow-hidden flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        {/* Color Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
        
        <div className="pl-2 flex-1">
          <h3 className="font-bold text-cream text-lg leading-tight">{matter.title}</h3>
          <p className="text-sm text-cream/50 mt-0.5">{matter.case_type || 'General Matter'}</p>
          
          {matter.next_hearing_date && (
            <p className="text-sm text-gold mt-2 font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Next Hearing: {new Date(matter.next_hearing_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          )}
        </div>
        
        {draftCount > 0 && (
          <div className="shrink-0 bg-gold/10 border border-gold/20 text-gold text-xs font-medium px-2.5 py-1 rounded-full">
            {draftCount} Document{draftCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
}
