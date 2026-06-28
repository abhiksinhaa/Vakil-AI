import 'server-only';
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
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('UNAUTHENTICATED');

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    throw new Error('UNAUTHENTICATED');
  }
  return data.user;
}
