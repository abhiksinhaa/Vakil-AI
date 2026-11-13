import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import {
  FIRM_SEAT_CONFIG,
  PLAN_CONFIG,
  PRICING_VERSION,
  type BillingCycle,
  type PaidPlan,
} from '@/lib/plans'

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment unavailable' }, { status: 500 })
  }

  const { plan, userId, billingCycle = 'monthly' } = await req.json()
  const validPlan = plan === 'basic' || plan === 'pro' || plan === 'firm'
  const validCycle = billingCycle === 'monthly' || billingCycle === 'annual'
  const validFirmSeat = plan === 'firm_seat'

  if ((!validPlan && !validFirmSeat) || !validCycle) {
    return NextResponse.json({ error: 'Invalid plan or billing cycle' }, { status: 400 })
  }

  const selectedCycle = billingCycle as BillingCycle
  const amount = validFirmSeat
    ? FIRM_SEAT_CONFIG[`${selectedCycle}Amount`]
    : PLAN_CONFIG[plan as PaidPlan][`${selectedCycle}Amount`]

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `draftee_${plan}_${Date.now()}`,
    notes: { plan, userId, billingCycle: selectedCycle, pricingVersion: PRICING_VERSION },
  })

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    plan,
  })
}
