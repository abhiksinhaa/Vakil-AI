import { requireUser, adminDb } from '@/lib/supabaseAdmin';
import { PLAN_CONFIG } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
}

export async function POST(req: Request) {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    console.error('[create-subscription] Razorpay keys missing on server', {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      hasServerKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasServerKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
      hasPublicKeyId: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      hasPublicKeySecret: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET,
    });
    return Response.json({ error: { message: 'Razorpay keys not configured on server.' } }, { status: 500 });
  }

  let decoded;
  try {
    decoded = await requireUser(req);
  } catch (err) {
    return Response.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || 'pro').toLowerCase();
    if (!['basic', 'standard', 'pro'].includes(plan)) {
      return Response.json({ error: { message: 'Unsupported plan' } }, { status: 400 });
    }

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG] as any;
    const planId = planConfig?.planId;
    if (!planId) {
      console.error('[create-subscription] no planId configured for plan', plan);
      return Response.json({ error: { message: 'Plan not configured on server.' } }, { status: 500 });
    }

    // Create subscription on Razorpay
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const upstream = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 12,
        quantity: 1,
        notify_info: {
          notify_phone: '',
          notify_email: '',
        },
        customer_notify: 1,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('[create-subscription] razorpay error', data);
      return Response.json({ error: { message: data.error?.description || 'Subscription creation failed' } }, { status: upstream.status });
    }

    // Optionally persist subscription reference in payments table
    try {
      const db = adminDb();
      await db.from('payments').insert([{ user_id: decoded.id, razorpay_subscription_id: data.id, status: 'created', type: 'subscription', plan: plan, amount_paise: planConfig.amount, created_at: new Date().toISOString() }]);
    } catch (err) {
      console.warn('[create-subscription] failed to persist payment metadata', err);
    }

    return Response.json({ success: true, subscription_id: data.id, data }, { status: 200 });
  } catch (err) {
    console.error('[create-subscription] unexpected error', err);
    return Response.json({ error: { message: 'Subscription creation failed' } }, { status: 500 });
  }
}
