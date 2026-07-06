import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set or invalid for server-side Supabase admin client.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  try {
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);
  } catch (err) {
    console.error('Failed to create Supabase admin client:', err);
    throw err;
  }
  return supabaseAdminClient;
}
