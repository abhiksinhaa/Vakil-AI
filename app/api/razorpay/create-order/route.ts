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
  const { plan, userId } = await req.json()
  
  const PLANS: Record<string, {amount: number; drafts: number}> = {
    basic: { amount: 14900, drafts: 90 },
    pro: { amount: 39900, drafts: 175 },
  }

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
  return NextResponse.json({ 
    orderId: order.id, 
    amount: order.amount, 
    plan,
  })
}
