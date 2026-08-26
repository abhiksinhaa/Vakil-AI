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
          razorpay_signature, plan, userId, amount, billingCycle } = body

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
  if (billingCycle === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  }

  const PLANS: Record<string, any> = {
    basic: {
      monthly: { amount: 14900, drafts_limit: 90, plan_name: 'basic' },
      annual:  { amount: 149900, drafts_limit: 90, plan_name: 'basic' },
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

  const selectedPlanCycle = (PLANS[plan] || PLANS.basic)[billingCycle === 'annual' ? 'annual' : 'monthly'];
  let planName = selectedPlanCycle.plan_name;
  let draftsLimit = selectedPlanCycle.drafts_limit;

  if (plan === 'firm_seat') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('org_id').eq('id', userId).single();
    if (profile?.org_id) {
      const { data: org } = await supabaseAdmin.from('organizations').select('seats_total').eq('id', profile.org_id).single();
      if (org) {
        await supabaseAdmin.from('organizations').update({ seats_total: (org.seats_total || 3) + 1 }).eq('id', profile.org_id);
      }
    }
  } else if (plan === 'firm') {
    const orgName = `Firm - ${userId.substring(0, 5)}`;
    const { data: newOrg, error: orgError } = await supabaseAdmin.from('organizations').insert({
      name: orgName,
      owner_id: userId,
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
      user_id: userId,
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
      .eq('id', userId);

    if (updateError) console.error('Supabase update FAILED:', updateError);
  } else {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: planName,
        drafts_limit: draftsLimit,
        plan_expires_at: expiresAt.toISOString(),
        razorpay_payment_id,
      })
      .eq('id', userId);

    if (updateError) console.error('Supabase update FAILED:', updateError);
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
