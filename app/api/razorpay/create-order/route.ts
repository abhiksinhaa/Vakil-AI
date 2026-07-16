import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAN_PRICES = {
  starter: 14900, // ₹149
  standard: 19900, // ₹199
  pro: 29900, // ₹299
};

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const plan = String(body.plan).toLowerCase() as keyof typeof PLAN_PRICES;

    if (!PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const currency = 'INR';
    const receipt = `draftee_${plan}_${Date.now()}`;

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: { plan, user_id: user.id },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create order' }, { status: 500 });
  }
}
