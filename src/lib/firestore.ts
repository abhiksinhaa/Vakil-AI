import { supabase } from './supabase';
import type { DraftInput, DraftRecord } from './types';

export interface ChatSession {
  id: string;
  preview: string;
  updatedAt: string;
  messages: any[];
}

function tsToIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
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
    created_at: tsToIso(data.created_at ?? data.createdAt),
  };
}

export async function saveDraft(draft: DraftInput) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (authError || !currentUser) throw new Error('Not authenticated');

  let fullSituation = draft.situation || '';
  let extractedAmount = draft.amount || null;

  if (draft.dynamicFields && Object.keys(draft.dynamicFields).length > 0) {
    if (fullSituation) fullSituation += '\n\n';
    fullSituation += '--- Additional Details ---\n';

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

  const now = new Date().toISOString();
  const draftRow = {
    user_id: currentUser.id,
    documentType: draft.draftType,
    partyName: draft.party1Name ?? '',
    draftContent: draft.generatedDraft,
    created_at: now,
    draft_type: draft.draftType,
    party1_name: draft.party1Name ?? '',
    party1_address: draft.party1Address ?? '',
    party2_name: draft.party2Name ?? '',
    party2_address: draft.party2Address ?? '',
    situation: fullSituation,
    amount: extractedAmount,
    generated_draft: draft.generatedDraft,
    updated_at: now,
  };

  const { data, error } = await supabase.from('drafts').insert(draftRow).select('id').single();
  if (error) {
    console.error('saveDraft failed', error);
    throw error;
  }

  return { id: data.id };
}

export async function fetchRecentDrafts(max = 5): Promise<DraftRecord[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (authError || !currentUser) return [];

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(max);

  if (error) {
    console.error('fetchRecentDrafts failed', error);
    return [];
  }

  return (data || []).map((row) => mapDraft(String((row as any).id), row as Record<string, unknown>));
}

export async function fetchAllDrafts(): Promise<DraftRecord[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (authError || !currentUser) return [];

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchAllDrafts failed', error);
    return [];
  }

  return (data || []).map((row) => mapDraft(String((row as any).id), row as Record<string, unknown>));
}

export async function saveWaitlist(entry: Record<string, string>) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('waitlist').insert([{ ...entry, created_at: now }]);
  return { data: error ? null : true, error };
}

export async function saveChatSession(sessionId: string, messages: any[]) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (authError || !currentUser || messages.length <= 1) return;

  const cleanMessages = messages.map((msg) => {
    const cleanMsg = { ...msg };
    if (cleanMsg.attachment && cleanMsg.attachment.inlineData) {
      cleanMsg.attachment = { fileName: cleanMsg.attachment.fileName };
    }
    return cleanMsg;
  });

  const firstUserMessage = cleanMessages.find((m) => m.role === 'user');
  const preview = firstUserMessage ? `${String(firstUserMessage.content).slice(0, 60)}...` : 'New Chat';
  const now = new Date().toISOString();

  const { error } = await supabase.from('chat_sessions').upsert([
    {
      id: sessionId,
      user_id: currentUser.id,
      preview,
      updated_at: now,
      messages: cleanMessages,
    },
  ]);
  if (error) {
    console.error('saveChatSession failed', error);
    throw error;
  }
}

export async function fetchChatHistory(): Promise<ChatSession[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (authError || !currentUser) return [];

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('fetchChatHistory failed', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: String((row as any).id),
    preview: String((row as any).preview ?? 'Chat'),
    updatedAt: tsToIso((row as any).updated_at),
    messages: (row as any).messages || [],
  }));
}
