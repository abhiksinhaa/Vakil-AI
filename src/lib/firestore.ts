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
    draft_type: String(data.draft_type ?? ''),
    party1_name: String(data.party1_name ?? ''),
    party1_address: String(data.party1_address ?? ''),
    party2_name: String(data.party2_name ?? ''),
    party2_address: String(data.party2_address ?? ''),
    situation: String(data.situation ?? ''),
    amount: (data.amount as string) ?? null,
    generated_draft: String(data.generated_draft ?? ''),
    created_at: tsToIso(data.created_at),
  };
}

export async function saveDraft(draft: DraftInput) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = await addDoc(collection(db, 'drafts'), {
    user_id: user.uid,
    draft_type: draft.draftType,
    party1_name: draft.party1Name ?? '',
    party1_address: draft.party1Address ?? '',
    party2_name: draft.party2Name ?? '',
    party2_address: draft.party2Address ?? '',
    situation: draft.situation,
    amount: draft.amount || null,
    generated_draft: draft.generatedDraft,
    created_at: serverTimestamp(),
  });

  return { id: ref.id };
}

export async function fetchRecentDrafts(max = 5): Promise<DraftRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, 'drafts'),
    where('user_id', '==', user.uid),
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
    collection(db, 'drafts'),
    where('user_id', '==', user.uid),
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
