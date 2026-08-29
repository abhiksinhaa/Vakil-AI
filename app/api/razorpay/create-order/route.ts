import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment unavailable' }, { status: 500 })
  }
  const { plan, userId, billingCycle = 'monthly' } = await req.json()
  
  const PLANS: Record<string, any> = {
    basic: {
      monthly: { amount: 14900, drafts_limit: 90, promotionalAmount: 9900 },
      annual:  { amount: 149900, drafts_limit: 90, promotionalAmount: 99900 },
    },
    pro: {
      monthly: { amount: 39900, drafts_limit: 175 },
      annual:  { amount: 399900, drafts_limit: 175 },
    },
    firm: {
      monthly: { amount: 99900, drafts_limit: 500 },
      annual:  { amount: 999900, drafts_limit: 500 },
    },
    firm_seat: {
      monthly: { amount: 29900 },
      annual:  { amount: 29900 },
    }
  };

  if (!PLANS[plan] || !PLANS[plan][billingCycle]) {
    return NextResponse.json({ error: 'Invalid plan or billing cycle' }, { status: 400 })
  }

  // Check if this is a basic plan and if we're within the first 100 paid users
  let finalAmount = PLANS[plan][billingCycle].amount
  let discountApplied = false

  if (plan === 'basic' && PLANS[plan][billingCycle].promotionalAmount) {
    // Count existing paid users (plan != 'free' and plan_expires_at is in future)
    const now = new Date().toISOString()
    const { count: paidUserCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('plan', 'free')
      .gt('plan_expires_at', now)

    if (!countError && paidUserCount !== null && paidUserCount < 100) {
      // We're within the first 100 paid users, apply discount
      finalAmount = PLANS[plan][billingCycle].promotionalAmount
      discountApplied = true
    }
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
  const order = await razorpay.orders.create({
    amount: finalAmount,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    notes: { plan, userId, discountApplied: String(discountApplied) },
  })
  return NextResponse.json({ 
    orderId: order.id, 
    amount: order.amount, 
    plan,
    discountApplied,
  })
}
