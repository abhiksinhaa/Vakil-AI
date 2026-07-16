import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseServer';

export function adminDb() {
  return getSupabaseAdmin();
}

export function adminAuth() {
  return getSupabaseAdmin().auth;
}

/**
 * Verify the `Authorization: Bearer <access_token>` header and return the user.
 * Throws if missing/invalid — callers map that to a 401.
 */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    throw new Error('No token provided');
  }

  // Use anon key but pass token in auth header
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Auth error:', error?.message, error?.status);
    throw new Error('Unauthorized');
  }

  return { id: user.id, email: user.email };
}
