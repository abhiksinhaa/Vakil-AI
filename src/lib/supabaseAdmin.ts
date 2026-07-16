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
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { id: user.id, email: user.email };
}
