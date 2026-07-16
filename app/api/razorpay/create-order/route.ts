import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'

const PLANS: Record<string, {amount: number; drafts: number}> = {
  basic:    { amount: 14900, drafts: 30  },
  standard: { amount: 19900, drafts: 40  },
  pro:      { amount: 29900, drafts: 100 },
}

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment unavailable' }, { status: 500 })
  }
  const { plan, userId } = await req.json()
  if (!PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
  const order = await razorpay.orders.create({
    amount: PLANS[plan].amount,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    notes: { plan, userId },
  })
  return NextResponse.json({ orderId: order.id, amount: order.amount, plan })
}
