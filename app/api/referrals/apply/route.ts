import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mirrors the old Postgres grant_referral_rewards(): 2 Pro months per 5 completed referrals. */
async function grantReferralRewards(referrerId: string) {
  const db = adminDb();
  const countSnap = await db
    .collection('referrals')
    .where('referrer_id', '==', referrerId)
    .where('status', '==', 'completed')
    .count()
    .get();
  const total = countSnap.data().count;
  const newRewards = Math.floor(total / 5) * 2;

  const subRef = db.collection('subscriptions').doc(referrerId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(subRef);
    const data = snap.exists ? snap.data() : {};
    const granted = (data?.referral_rewards_granted as number) || 0;
    if (newRewards <= granted) return;

    const now = new Date();
    const base =
      data?.pro_until && new Date(data.pro_until) > now ? new Date(data.pro_until) : now;
    const proUntil = new Date(base);
    proUntil.setMonth(proUntil.getMonth() + (newRewards - granted));

    tx.set(
      subRef,
      {
        user_id: referrerId,
        plan: 'pro',
        pro_until: proUntil.toISOString(),
        referral_rewards_granted: newRewards,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function POST(req: Request) {
  let decoded;
  try {
    decoded = await requireUser(req);
  } catch {
    return Response.json({ applied: false, error: 'Not authenticated' }, { status: 401 });
  }

  const uid = decoded.uid;
  const { referralCode } = await req.json().catch(() => ({ referralCode: '' }));
  if (!referralCode) return Response.json({ applied: false }, { status: 400 });

  const db = adminDb();
  const code = String(referralCode).trim().toUpperCase();
  const codeSnap = await db.collection('referralCodes').doc(code).get();
  if (!codeSnap.exists) return Response.json({ applied: false });

  const referrerId = codeSnap.data()?.uid as string | undefined;
  if (!referrerId || referrerId === uid) return Response.json({ applied: false });

  // One referral per referred user (doc id = referred uid enforces uniqueness).
  const referralRef = db.collection('referrals').doc(uid);
  const existing = await referralRef.get();
  if (existing.exists) return Response.json({ applied: false });

  await referralRef.set({
    referrer_id: referrerId,
    referred_user_id: uid,
    status: 'completed',
    created_at: FieldValue.serverTimestamp(),
  });
  await db.collection('profiles').doc(uid).set({ referred_by: referrerId }, { merge: true });

  await grantReferralRewards(referrerId);

  return Response.json({ applied: true });
}
