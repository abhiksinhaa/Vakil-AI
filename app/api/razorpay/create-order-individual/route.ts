import Razorpay from 'razorpay';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return Response.json({ error: 'Payment service unavailable.' }, { status: 500 });
  }

  let user: { id: string };
  try {
    user = await requireUser(req);
  } catch {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const { draftId } = await req.json();
    if (typeof draftId !== 'string' || !draftId) {
      return Response.json({ error: 'Draft is required.' }, { status: 400 });
    }

    const db = adminDb();
    const [{ data: profile }, { data: draft }] = await Promise.all([
      db.from('profiles').select('user_type').eq('id', user.id).maybeSingle(),
      db.from('drafts').select('id, is_unlocked').eq('id', draftId).eq('user_id', user.id).maybeSingle(),
    ]);

    if (profile?.user_type !== 'individual') {
      return Response.json({ error: 'This payment is only available to individual accounts.' }, { status: 403 });
    }
    if (!draft) return Response.json({ error: 'Draft not found.' }, { status: 404 });
    if (draft.is_unlocked) return Response.json({ error: 'This draft is already unlocked.' }, { status: 409 });

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: 900,
      currency: 'INR',
      receipt: `draft_${draftId.slice(0, 20)}_${Date.now()}`,
      notes: { purpose: 'individual_draft_unlock', userId: user.id, draftId },
    });

    return Response.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('[razorpay/create-order-individual]', error);
    return Response.json({ error: 'Could not create payment order.' }, { status: 500 });
  }
}