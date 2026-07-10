import crypto from 'crypto';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';
import { buildSubscriptionPayload } from '@/lib/subscription';

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
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (currentSubError) {
      throw currentSubError;
    }

    const paidBalance = Number(currentSub?.drafts_count ?? 0) + 1;
    const { error: updateError } = await db.from('subscriptions').upsert(
      buildSubscriptionPayload({
        id: uid,
        plan: currentSub?.plan ?? 'free',
        drafts_used: currentSub?.drafts_used ?? 0,
        created_at: currentSub?.created_at ?? new Date().toISOString(),
        chat_day_key: currentSub?.chat_day_key ?? new Date().toISOString(),
        chat_count: currentSub?.chat_count ?? 0,
        drafts_count: paidBalance,
        last_reset: currentSub?.last_reset ?? new Date().toISOString(),
      }),
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
