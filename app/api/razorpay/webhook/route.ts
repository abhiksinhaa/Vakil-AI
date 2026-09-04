import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '../../../../src/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidWebhookSignature(body: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  return expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!isValidWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload?.event;

    if (event !== 'payment.refunded') {
      return NextResponse.json({ received: true });
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'Refund event missing payment identifiers' }, { status: 400 });
    }

    const amount = Number(paymentEntity.amount);
    const amountRefunded = Number(paymentEntity.amount_refunded);
    const isFullyRefunded = Number.isFinite(amount) && amount > 0
      ? amountRefunded >= amount
      : paymentEntity.status === 'refunded';

    if (!isFullyRefunded) {
      return NextResponse.json({ received: true, reverted: false, partial: true });
    }

    const db = adminDb();
    const { data: payment, error: paymentLookupError } = await db
      .from('payments')
      .select('id, user_id, razorpay_order_id, razorpay_payment_id, created_at, plan, status')
      .eq('razorpay_payment_id', paymentId)
      .maybeSingle();

    if (paymentLookupError) {
      console.error('[razorpay/webhook] Payment lookup failed:', paymentLookupError);
      return NextResponse.json({ error: 'Could not find payment' }, { status: 500 });
    }

    if (!payment?.user_id) {
      console.warn('[razorpay/webhook] No payment found for refunded payment:', { orderId, paymentId });
      return NextResponse.json({ received: true, reverted: false });
    }

    const { error: paymentUpdateError } = await db
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      console.error('[razorpay/webhook] Payment status update failed:', paymentUpdateError);
      return NextResponse.json({ error: 'Could not update payment' }, { status: 500 });
    }

    const { data: otherValidPayments, error: newerPaymentError } = await db
      .from('payments')
      .select('id, razorpay_payment_id')
      .eq('user_id', payment.user_id)
      .in('status', ['success', 'paid'])
      .neq('id', payment.id)
      .limit(1);

    if (newerPaymentError) {
      console.error('[razorpay/webhook] Newer payment lookup failed:', newerPaymentError);
      return NextResponse.json({ error: 'Could not verify current payment' }, { status: 500 });
    }

    const { data: profile, error: profileLookupError } = await db
      .from('profiles')
      .select('id, plan, razorpay_payment_id')
      .eq('id', payment.user_id)
      .maybeSingle();

    if (profileLookupError) {
      console.error('[razorpay/webhook] Profile lookup failed:', profileLookupError);
      return NextResponse.json({ error: 'Could not verify profile entitlement' }, { status: 500 });
    }

    const paymentCurrentlyGrantsAccess = profile?.razorpay_payment_id === payment.razorpay_payment_id &&
      String(profile?.plan || 'free').toLowerCase() !== 'free';

    if (otherValidPayments?.length || !paymentCurrentlyGrantsAccess) {
      return NextResponse.json({
        received: true,
        reverted: false,
        reason: otherValidPayments?.length ? 'another_valid_payment' : 'refunded_payment_not_current_entitlement',
      });
    }

    const { error: profileUpdateError } = await db
      .from('profiles')
      .update({
        plan: 'free',
        drafts_limit: 5,
        drafts_used: 0,
        plan_expires_at: null,
        razorpay_payment_id: null,
        org_id: null,
      })
      .eq('id', payment.user_id)
      .eq('razorpay_payment_id', payment.razorpay_payment_id)
      .neq('plan', 'free');

    if (profileUpdateError) {
      console.error('[razorpay/webhook] Profile update failed:', profileUpdateError);
      return NextResponse.json({ error: 'Could not revert profile' }, { status: 500 });
    }

    const { error: subscriptionUpdateError } = await db
      .from('subscriptions')
      .update({ plan: 'free' })
      .eq('id', payment.user_id);

    if (subscriptionUpdateError) {
      console.error('[razorpay/webhook] Subscription update failed:', subscriptionUpdateError);
      return NextResponse.json({ error: 'Could not revoke subscription' }, { status: 500 });
    }

    return NextResponse.json({ received: true, reverted: true });
  } catch (error) {
    console.error('[razorpay/webhook] Invalid payload or database error:', error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }
}