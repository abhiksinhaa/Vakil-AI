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

  // Must be a signed-in user — Pro is granted to this account.
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, months = 1 } = body;

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

    // Signature valid → activate Pro server-side (clients cannot do this directly).
    const db = adminDb();
    const uid = decoded.uid;
    const subRef = db.collection('subscriptions').doc(uid);
    const snap = await subRef.get();
    const now = new Date();
    const current = snap.exists ? snap.data() : null;
    const base =
      current?.pro_until && new Date(current.pro_until) > now
        ? new Date(current.pro_until)
        : now;
    const proUntil = new Date(base);
    proUntil.setMonth(proUntil.getMonth() + Number(months || 1));

    await subRef.set(
      {
        user_id: uid,
        plan: 'pro',
        pro_until: proUntil.toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db.collection('payments').add({
      user_id: uid,
      razorpay_order_id,
      razorpay_payment_id,
      amount_paise: Number(body.amount_paise) || 139900,
      status: 'paid',
      created_at: FieldValue.serverTimestamp(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[razorpay/verify]', err);
    return Response.json(
      { error: { message: 'Verification failed' }, success: false },
      { status: 500 }
    );
  }
}
