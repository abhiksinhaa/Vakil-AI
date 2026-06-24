import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '@/lib/firebaseAdmin';

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

  // Must be a signed-in user
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
    const uid = decoded.uid;
    const subRef = db.collection('subscriptions').doc(uid);
    
    // Increment paid_drafts_balance
    await subRef.set(
      {
        user_id: uid,
        paid_drafts_balance: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db.collection('payments').add({
      user_id: uid,
      razorpay_order_id,
      razorpay_payment_id,
      amount_paise: 5000,
      status: 'paid',
      type: 'single_draft',
      created_at: FieldValue.serverTimestamp(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[razorpay/verify-draft]', err);
    return Response.json(
      { error: { message: 'Verification failed' }, success: false },
      { status: 500 }
    );
  }
}
