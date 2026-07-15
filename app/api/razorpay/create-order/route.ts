import { requireUser } from '@/lib/supabaseAdmin';
import { PLAN_CONFIG, type PaidPlan } from '@/lib/plans';
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAID_PLANS: PaidPlan[] = ['starter', 'standard', 'pro'];

export async function POST(req: Request) {
  console.log('KEY_ID:', process.env.RAZORPAY_KEY_ID?.substring(0, 15));
  console.log('SECRET:', process.env.RAZORPAY_KEY_SECRET?.substring(0, 5));

  console.log('ENV CHECK:', {
    KEY_ID: process.env.RAZORPAY_KEY_ID,
    SECRET_EXISTS: !!process.env.RAZORPAY_KEY_SECRET,
  });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log('Razorpay keys:', !!keyId, !!keySecret);

  if (!keyId || !keySecret) {
    console.error('MISSING KEYS - keyId:', keyId, 'keySecret:', !!keySecret);
    return NextResponse.json(
      { error: 'Payment unavailable' },
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

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const data = await razorpay.orders.create({
      amount: planConfig.amount,
      currency,
      receipt,
      notes: { plan },
    });

    return Response.json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      plan,
      planName: planConfig.label,
    });
  } catch (err: any) {
    console.error('Full error:', err);
    return Response.json({
      error: { message: err?.message || String(err) }
    }, { status: 500 });
  }
}
