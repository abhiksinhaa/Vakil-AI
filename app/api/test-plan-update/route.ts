import { NextResponse } from 'next/server';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';
import { PLAN_CONFIG, type PaidPlan } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return Response.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || 'pro').toLowerCase();
  if (!['basic', 'standard', 'pro'].includes(plan)) {
    return Response.json({ error: { message: 'Unsupported plan' } }, { status: 400 });
  }

  const planConfig = PLAN_CONFIG[plan as PaidPlan];
  if (!planConfig) {
    return Response.json({ error: { message: 'Plan configuration missing' } }, { status: 500 });
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { data, error } = await adminDb()
    .from('profiles')
    .update({
      plan,
      drafts_limit: planConfig.draftsLimit,
      drafts_used: 0,
      plan_expires_at: expiresAt.toISOString(),
    })
    .eq('id', user.id)
    .select();

  if (error) {
    console.error('[test-plan-update] update failed', error);
    return Response.json({ error: { message: 'Plan update failed', details: error } }, { status: 500 });
  }

  return Response.json({ success: true, data });
}
