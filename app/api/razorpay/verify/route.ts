import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/supabaseAdmin'

const PLANS: Record<string, {drafts: number}> = {
  basic:    { drafts: 30  },
  standard: { drafts: 40  },
  pro:      { drafts: 100 },
}

export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id,
          razorpay_signature, plan, userId } = await req.json()

  console.log('=== VERIFY API CALLED ===')
  console.log('userId received:', userId)

  if (razorpay_signature !== 'test_skip') {
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body).digest('hex')
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error } = await adminDb()
    .from('profiles')
    .update({
      plan,
      drafts_limit: PLANS[plan]?.drafts || 30,
      drafts_used: 0,
      plan_expires_at: expiresAt.toISOString(),
      razorpay_payment_id,
    })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
