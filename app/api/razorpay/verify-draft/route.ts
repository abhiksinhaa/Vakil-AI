import crypto from 'crypto';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return Response.json(
      { error: { message: 'Razorpay secret not configured' }, success: false },
      { status: 500 }
    );
  }

  let decoded;
  try {
    decoded = await requireUser(req);
  } catch {
    return Response.json(
      { error: { message: 'Not authenticated' }, success: false },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { error: { message: 'Missing payment fields' }, success: false },
        { status: 400 }
      );
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return Response.json(
        { error: { message: 'Invalid payment signature' }, success: false },
        { status: 400 }
      );
    }

    const db = adminDb();
    const uid = decoded.id;

    const { data: currentSub, error: currentSubError } = await db
      .from('subscriptions')
      .select('paid_drafts_balance')
      .eq('id', uid)
      .maybeSingle();
    if (currentSubError) {
      throw currentSubError;
    }

    const paidBalance = Number(currentSub?.paid_drafts_balance ?? 0) + 1;
    const { error: updateError } = await db.from('subscriptions').upsert(
      {
        id: uid,
        user_id: uid,
        paid_drafts_balance: paidBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (updateError) {
      throw updateError;
    }

    const { error: paymentError } = await db.from('payments').insert([
      {
        user_id: uid,
        razorpay_order_id,
        razorpay_payment_id,
        amount_paise: 5000,
        status: 'paid',
        type: 'single_draft',
        created_at: new Date().toISOString(),
      },
    ]);
    if (paymentError) {
      throw paymentError;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('[razorpay/verify-draft]', err);
    return Response.json(
      { error: { message: 'Verification failed' }, success: false },
      { status: 500 }
    );
  }
}
