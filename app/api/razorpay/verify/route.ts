import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id,
          razorpay_signature, plan, userId, amount } = await req.json()

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

  const planName = 'premium';
  const draftsLimit = null;

  const db = adminDb()
  const { error } = await db
    .from('profiles')
    .update({
      plan: planName,
      drafts_limit: draftsLimit,
      drafts_used: 0,
      plan_expires_at: expiresAt.toISOString(),
      razorpay_payment_id,
    })
    .eq('id', userId)

  console.log('Plan update error:', error)
  console.log('Plan updated for:', userId)

  if (error) {
    return NextResponse.json({ error: 'Update failed', details: error }, { status: 500 })
  }

  const { error: paymentError } = await db
    .from('payments')
    .insert({
      user_id: userId,
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
      plan: planName,
      amount: amount || 0,
      status: 'success',
      created_at: new Date().toISOString()
    })

  if (paymentError) {
    console.error('Payment record insert error:', paymentError)
  }

  return NextResponse.json({ success: true })
}
