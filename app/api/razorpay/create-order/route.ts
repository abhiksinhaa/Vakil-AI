import { requireUser } from '@/lib/supabaseAdmin';
import { PLAN_CONFIG, type PaidPlan } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAID_PLANS: PaidPlan[] = ['basic', 'standard', 'pro'];

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json(
      { error: { message: 'Razorpay keys not configured on server.' } },
      { status: 500 }
    );
  }

  try {
    await requireUser(req);
  } catch {
    return Response.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || 'pro').toLowerCase() as PaidPlan;

    if (!PAID_PLANS.includes(plan)) {
      return Response.json({ error: { message: 'Unsupported plan' } }, { status: 400 });
    }

    const planConfig = PLAN_CONFIG[plan];
    const currency = 'INR';
    const receipt = `draftee_${plan}_${Date.now()}`;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const upstream = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: planConfig.amount, currency, receipt }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('[razorpay/create-order]', data);
      return Response.json(
        { error: { message: data.error?.description || 'Order creation failed' } },
        { status: upstream.status }
      );
    }

    return Response.json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      plan,
      planName: planConfig.label,
    });
  } catch (err) {
    console.error('[razorpay/create-order]', err);
    return Response.json({ error: { message: 'Order creation failed' } }, { status: 500 });
  }
}
