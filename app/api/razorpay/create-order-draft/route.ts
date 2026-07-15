import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log('KEY_ID exists:', !!keyId);
  console.log('KEY_SECRET exists:', !!keySecret);

  if (!keyId || !keySecret) {
    console.error('Missing:', { keyId: !!keyId, keySecret: !!keySecret });
    return NextResponse.json(
      { error: 'Payment service unavailable. Please try again later.' },
      { status: 500 }
    );
  }

  try {
    const amount = 5000; // ₹50
    const currency = 'INR';
    const receipt = `draftee_draft_${Date.now()}`;

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const data = await razorpay.orders.create({ amount, currency, receipt });

    return Response.json({ id: data.id, amount: data.amount, currency: data.currency });
  } catch (err) {
    console.error('[razorpay/create-order-draft]', err);
    return Response.json({ error: { message: 'Order creation failed' } }, { status: 500 });
  }
}
