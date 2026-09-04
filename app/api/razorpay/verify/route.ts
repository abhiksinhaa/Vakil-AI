import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { adminDb, requireUser } from '../../../../src/lib/supabaseAdmin'
import { fetchRazorpayOrder } from '../../../../src/lib/razorpayServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    return NextResponse.json({ success: false, error: 'Payment verification unavailable' }, { status: 500 })
  }

  let authenticatedUser
  try {
    authenticatedUser = await requireUser(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billingCycle } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing payment fields' }, { status: 400 })
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    const signatureBuffer = Buffer.from(razorpay_signature, 'utf8')
    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    const order = await fetchRazorpayOrder(razorpay_order_id)
    const orderUserId = order.notes?.userId
    const plan = order.notes?.plan
    const expectedBillingCycle = order.notes?.billingCycle === 'annual' ? 'annual' : 'monthly'
    if (billingCycle && billingCycle !== expectedBillingCycle) {
      return NextResponse.json({ success: false, error: 'Payment billing cycle does not match the order' }, { status: 400 })
    }
    if (orderUserId !== authenticatedUser.id || !plan || order.amount <= 0) {
      return NextResponse.json({ success: false, error: 'Payment order does not match the authenticated user' }, { status: 400 })
    }

    const supabaseAdmin = adminDb()
    const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
      .from('payments')
      .select('user_id, plan, status')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle()
    if (existingPaymentError) throw existingPaymentError
    if (existingPayment) {
      if (existingPayment.user_id !== authenticatedUser.id || existingPayment.plan !== plan) {
        return NextResponse.json({ success: false, error: 'Payment is already associated with another user or plan' }, { status: 409 })
      }
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

  const expiresAt = new Date()
  if (expectedBillingCycle === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  }

  const PLANS: Record<string, any> = {
    basic: {
      monthly: { amount: 14900, promotionalAmount: 9900, drafts_limit: 90, plan_name: 'basic' },
      annual:  { amount: 149900, promotionalAmount: 99900, drafts_limit: 90, plan_name: 'basic' },
    },
    pro: {
      monthly: { amount: 39900, drafts_limit: 175, plan_name: 'pro' },
      annual:  { amount: 399900, drafts_limit: 175, plan_name: 'pro' },
    },
    firm: {
      monthly: { amount: 99900, drafts_limit: 500, plan_name: 'firm' },
      annual:  { amount: 999900, drafts_limit: 500, plan_name: 'firm' },
    },
    firm_seat: {
      monthly: { amount: 29900, plan_name: 'firm_seat' },
      annual:  { amount: 29900, plan_name: 'firm_seat' },
    }
  };

  const selectedPlanCycle = PLANS[plan]?.[expectedBillingCycle]
  if (!selectedPlanCycle || order.amount !== selectedPlanCycle.amount && !(plan === 'basic' && order.amount === selectedPlanCycle.promotionalAmount)) {
    return NextResponse.json({ success: false, error: 'Payment amount does not match the selected plan' }, { status: 400 })
  }
  let planName = selectedPlanCycle.plan_name;
  let draftsLimit = selectedPlanCycle.drafts_limit;

  if (plan === 'firm_seat') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('org_id').eq('id', authenticatedUser.id).single();
    if (profile?.org_id) {
      const { data: org } = await supabaseAdmin.from('organizations').select('seats_total').eq('id', profile.org_id).single();
      if (org) {
        await supabaseAdmin.from('organizations').update({ seats_total: (org.seats_total || 3) + 1 }).eq('id', profile.org_id);
      }
    }
  } else if (plan === 'firm') {
    const orgName = `Firm - ${authenticatedUser.id.substring(0, 5)}`;
    const { data: newOrg, error: orgError } = await supabaseAdmin.from('organizations').insert({
      name: orgName,
      owner_id: authenticatedUser.id,
      seats_total: 3,
      drafts_limit: 500,
      plan_expires_at: expiresAt.toISOString(),
    }).select().single();

    if (orgError) {
      console.error('Failed to create organization:', orgError);
      return NextResponse.json({ success: false, error: orgError.message }, { status: 500 });
    }

    await supabaseAdmin.from('organization_members').insert({
      org_id: newOrg.id,
      user_id: authenticatedUser.id,
      invited_email: 'owner@local',
      role: 'admin',
      status: 'active'
    });

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: planName,
        drafts_limit: draftsLimit,
        plan_expires_at: expiresAt.toISOString(),
        razorpay_payment_id,
        org_id: newOrg.id,
      })
      .eq('id', authenticatedUser.id);

    if (updateError) throw updateError;
  } else {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: planName,
        drafts_limit: draftsLimit,
        plan_expires_at: expiresAt.toISOString(),
        razorpay_payment_id,
      })
      .eq('id', authenticatedUser.id);

    if (updateError) throw updateError;
  }

  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({
      user_id: authenticatedUser.id,
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
      plan: planName,
      amount_paise: order.amount,
      status: 'success',
      created_at: new Date().toISOString()
    })

  console.log('Payment insert error:', paymentError)

  if (paymentError) {
    if (paymentError.code === '23505') {
      const { data: savedPayment } = await supabaseAdmin
        .from('payments')
        .select('user_id, plan')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .maybeSingle()
      if (savedPayment?.user_id === authenticatedUser.id && savedPayment.plan === plan) {
        return NextResponse.json({ success: true, alreadyProcessed: true })
      }
    }
    throw paymentError
  }

  console.log('Payment saved for user:', authenticatedUser.id)
  return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[razorpay/verify]', error)
    return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 500 })
  }
}
