import {
  addDoc,
  collection,
  doc,
  setDoc,
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

export interface ChatSession {
  id: string;
  preview: string;
  updatedAt: string;
  messages: any[];
}


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
    created_at: tsToIso(data.createdAt ?? data.created_at),
  };
}

export async function saveDraft(draft: DraftInput) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  console.log('saveDraft: current user uid=', user.uid);

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
    created_at: serverTimestamp(),
  });

  console.log('saveDraft: saved draft id=', ref.id, 'for uid=', user.uid);
  return { id: ref.id };
}

export async function fetchRecentDrafts(max = 5): Promise<DraftRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];
  console.log('fetchRecentDrafts: current user uid=', user.uid, 'max=', max);

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
  console.log('fetchAllDrafts: current user uid=', user.uid);

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

export async function saveChatSession(sessionId: string, messages: any[]) {
  const user = auth.currentUser;
  if (!user || messages.length <= 1) return; // Don't save if it's just the welcome message
  console.log('saveChatSession: current user uid=', user.uid, 'sessionId=', sessionId, 'messageCount=', messages.length);

  // Exclude attachment binary data or huge payloads if necessary, but saving directly is usually okay if they aren't massive.
  // The inlineData can be large, so we strip it out for storage to avoid quota issues.
  const cleanMessages = messages.map(msg => {
    const cleanMsg = { ...msg };
    if (cleanMsg.attachment && cleanMsg.attachment.inlineData) {
      cleanMsg.attachment = { fileName: cleanMsg.attachment.fileName }; // keep filename, drop base64
    }
    return cleanMsg;
  });

  const firstUserMessage = cleanMessages.find(m => m.role === 'user');
  const preview = firstUserMessage ? firstUserMessage.content.substring(0, 60) + '...' : 'New Chat';

  const ref = doc(db, 'users', user.uid, 'chats', sessionId);
  await setDoc(ref, {
    preview,
    updatedAt: serverTimestamp(),
    messages: cleanMessages
  }, { merge: true });
  console.log('saveChatSession: saved session', sessionId, 'for uid=', user.uid);
}

export async function fetchChatHistory(): Promise<ChatSession[]> {
  const user = auth.currentUser;
  if (!user) return [];
  console.log('fetchChatHistory: current user uid=', user.uid);

  const q = query(
    collection(db, 'users', user.uid, 'chats'),
    orderBy('updatedAt', 'desc'),
    fbLimit(30)
  );

  const snap = await getDocs(q);
  console.log('fetchChatHistory: fetched', snap.docs.length, 'sessions for uid=', user.uid);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      preview: data.preview || 'Chat',
      updatedAt: tsToIso(data.updatedAt),
      messages: data.messages || [],
    };
  });
}
