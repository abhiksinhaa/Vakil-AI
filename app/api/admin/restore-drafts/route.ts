import { adminDb, requireUser } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let decoded;
  try {
    decoded = await requireUser(req);
  } catch {
    return Response.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  const isAdmin = decoded.email?.toLowerCase() === 'admin@draftee.in';
  if (!isAdmin) {
    return Response.json({ error: { message: 'Forbidden' } }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
    const amount = Number(body.amount ?? 1);

    if (!userIds.length) {
      return Response.json({ error: { message: 'No user IDs provided' } }, { status: 400 });
    }

    const db = adminDb();
    const restoreAmount = Math.max(1, Math.min(1000, Number.isFinite(amount) ? amount : 1));

    for (const userId of userIds) {
      const { data: profileData, error: profileError } = await db
        .from('profiles')
        .select('drafts_used')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError || !profileData) continue;

      const currentUsed = Math.max(0, Number(profileData.drafts_used ?? 0));
      const nextUsed = Math.max(0, currentUsed - restoreAmount);

      await db.from('profiles').update({ drafts_used: nextUsed, updated_at: new Date().toISOString() }).eq('user_id', userId);
    }

    return Response.json({ restored: userIds.length, amount: restoreAmount, success: true });
  } catch (err) {
    console.error('[admin/restore-drafts]', err);
    return Response.json({ error: { message: 'Restore failed' } }, { status: 500 });
  }
}
