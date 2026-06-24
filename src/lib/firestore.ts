import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { DraftInput, DraftRecord } from './types';

/** Firestore Timestamps -> ISO strings so existing `new Date(...)` UI code keeps working. */
function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function mapDraft(id: string, data: Record<string, unknown>): DraftRecord {
  return {
    id,
    user_id: String(data.user_id ?? ''),
    draft_type: String(data.documentType ?? data.draft_type ?? ''),
    party1_name: String(data.partyName ?? data.party1_name ?? ''),
    party1_address: String(data.party1_address ?? ''),
    party2_name: String(data.party2_name ?? ''),
    party2_address: String(data.party2_address ?? ''),
    situation: String(data.situation ?? ''),
    amount: (data.amount as string) ?? null,
    generated_draft: String(data.draftContent ?? data.generated_draft ?? ''),
    unlocked: data.unlocked as boolean | undefined,
    created_at: tsToIso(data.createdAt ?? data.created_at),
  };
}

export async function saveDraft(draft: DraftInput) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  let fullSituation = draft.situation || '';
  let extractedAmount = draft.amount || null;

  if (draft.dynamicFields && Object.keys(draft.dynamicFields).length > 0) {
    if (fullSituation) fullSituation += '\n\n';
    fullSituation += '--- Additional Details ---\n';
    
    // Also try to extract an amount field if it exists in dynamic fields
    if (draft.dynamicFields['amount_involved']) {
      extractedAmount = draft.dynamicFields['amount_involved'];
    } else if (draft.dynamicFields['amount_claimed']) {
      extractedAmount = draft.dynamicFields['amount_claimed'];
    } else if (draft.dynamicFields['rent_amount']) {
      extractedAmount = draft.dynamicFields['rent_amount'];
    }

    if (draft.schema && draft.schema.fields) {
      draft.schema.fields.forEach((field: any) => {
        const val = draft.dynamicFields![field.id];
        if (val && val.trim()) {
          fullSituation += `${field.label}: ${val}\n`;
        }
      });
    } else {
      for (const [key, val] of Object.entries(draft.dynamicFields)) {
        if (val && val.trim()) {
          fullSituation += `${key}: ${val}\n`;
        }
      }
    }
  }

  const ref = await addDoc(collection(db, 'users', user.uid, 'drafts'), {
    // New fields requested
    documentType: draft.draftType,
    partyName: draft.party1Name ?? '',
    draftContent: draft.generatedDraft,
    createdAt: serverTimestamp(),

    // Legacy/compatibility fields
    user_id: user.uid,
    draft_type: draft.draftType,
    party1_name: draft.party1Name ?? '',
    party1_address: draft.party1Address ?? '',
    party2_name: draft.party2Name ?? '',
    party2_address: draft.party2Address ?? '',
    situation: fullSituation,
    amount: extractedAmount,
    generated_draft: draft.generatedDraft,
    unlocked: draft.unlocked ?? true, // Default true for backward compatibility and advocates
    created_at: serverTimestamp(),
  });

  return { id: ref.id };
}

export async function fetchRecentDrafts(max = 5): Promise<DraftRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, 'users', user.uid, 'drafts'),
    orderBy('created_at', 'desc'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDraft(d.id, d.data()));
}

export async function fetchAllDrafts(): Promise<DraftRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, 'users', user.uid, 'drafts'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDraft(d.id, d.data()));
}

/** Public waitlist signup (no auth required). Mirrors the old `{ data, error }` return shape. */
export async function saveWaitlist(entry: Record<string, string>) {
  try {
    await addDoc(collection(db, 'waitlist'), { ...entry, created_at: serverTimestamp() });
    return { data: true, error: null as null };
  } catch (error) {
    return { data: null, error };
  }
}
