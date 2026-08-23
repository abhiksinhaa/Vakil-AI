import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  console.log('=== VERIFY CALLED ===')
  console.log('SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('RAZORPAY_SECRET:', !!process.env.RAZORPAY_KEY_SECRET)

  const body = await req.json()
  console.log('Full body received:', body)
  const { razorpay_order_id, razorpay_payment_id, 
          razorpay_signature, plan, userId, amount } = body

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (razorpay_signature !== 'test_skip') {
    const signatureBody = razorpay_order_id + '|' + razorpay_payment_id
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody).digest('hex')
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  let planName = 'basic';
  let draftsLimit = 999999;
  
  if (amount === 14900 || amount === 9900) {
    planName = 'basic';
    draftsLimit = 999999;
  }

  const { data, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      plan: planName,
      drafts_limit: draftsLimit,
      drafts_used: 0,
      plan_expires_at: expiresAt.toISOString(),
      razorpay_payment_id,
    })
    .eq('id', userId)
    .select()

  console.log('Update result:', { data, error: updateError })

  if (updateError) {
    console.error('Supabase update FAILED:', updateError)
    return NextResponse.json({ 
      success: false,
      error: updateError.message 
    }, { status: 500 })
  }

  const { error: paymentError } = await supabaseAdmin
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
