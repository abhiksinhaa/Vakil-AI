import { adminDb, requireUser } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mirrors the old referral reward flow: 2 Pro months per 5 completed referrals. */
async function grantReferralRewards(referrerId: string) {
  const db = adminDb();
  const { count, error: countError } = await db
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('status', 'completed');

  if (countError) {
    console.error('grantReferralRewards count failed', countError);
    return;
  }

  const total = count ?? 0;
  const newRewards = Math.floor(total / 5) * 2;
  if (newRewards <= 0) return;

  const { data: current, error: currentError } = await db
    .from('subscriptions')
    .select('*')
    .eq('id', referrerId)
    .maybeSingle();

  if (currentError) {
    console.error('grantReferralRewards subscription fetch failed', currentError);
    return;
  }

  const granted = Number(current?.referral_rewards_granted ?? 0);
  if (newRewards <= granted) return;

  const now = new Date();
  const base = current?.pro_until && new Date(current.pro_until) > now ? new Date(current.pro_until) : now;
  const proUntil = new Date(base);
  proUntil.setMonth(proUntil.getMonth() + (newRewards - granted));

  const { error: upsertError } = await db.from('subscriptions').upsert(
    {
      id: referrerId,
      user_id: referrerId,
      plan: 'pro',
      pro_until: proUntil.toISOString(),
      referral_rewards_granted: newRewards,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    console.error('grantReferralRewards update failed', upsertError);
  }
}

export async function POST(req: Request) {
  let decoded;
  try {
    decoded = await requireUser(req);
  } catch {
    return Response.json({ applied: false, error: 'Not authenticated' }, { status: 401 });
  }

  const uid = decoded.id;
  const { referralCode } = await req.json().catch(() => ({ referralCode: '' }));
  if (!referralCode) return Response.json({ applied: false }, { status: 400 });

  const db = adminDb();
  const code = String(referralCode).trim().toUpperCase();
  const { data: referrer, error: referrerError } = await db
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();

  if (referrerError || !referrer?.id) {
    return Response.json({ applied: false });
  }

  const referrerId = String(referrer.id);
  if (referrerId === uid) return Response.json({ applied: false });

  const { data: existingReferral, error: referralError } = await db
    .from('referrals')
    .select('id')
    .eq('referred_user_id', uid)
    .maybeSingle();

  if (referralError) {
    console.error('Referral lookup failed', referralError);
    return Response.json({ applied: false });
  }

  if (existingReferral) return Response.json({ applied: false });

  const { error: insertError } = await db.from('referrals').insert([
    {
      referrer_id: referrerId,
      referred_user_id: uid,
      status: 'completed',
      created_at: new Date().toISOString(),
    },
  ]);
  if (insertError) {
    console.error('Referral insert failed', insertError);
    return Response.json({ applied: false }, { status: 500 });
  }

  const { error: profileError } = await db
    .from('profiles')
    .update({ referred_by: referrerId })
    .eq('id', uid);

  if (profileError) {
    console.error('Profile update failed', profileError);
  }

  await grantReferralRewards(referrerId);

  return Response.json({ applied: true });
}
