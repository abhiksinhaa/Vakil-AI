import { createClient } from '@supabase/supabase-js';

function isValidSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = isValidSupabaseUrl(envUrl)
  ? envUrl
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = envKey || 'placeholder-key';

if (!isValidSupabaseUrl(envUrl) || !envKey) {
  console.warn(
    'Supabase credentials missing or invalid. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveDraft(draft) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('drafts')
    .insert({
      user_id: user.id,
      draft_type: draft.draftType,
      party1_name: draft.party1Name,
      party1_address: draft.party1Address,
      party2_name: draft.party2Name,
      party2_address: draft.party2Address,
      situation: draft.situation,
      amount: draft.amount || null,
      generated_draft: draft.generatedDraft,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchRecentDrafts(limit = 5) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchAllDrafts() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
