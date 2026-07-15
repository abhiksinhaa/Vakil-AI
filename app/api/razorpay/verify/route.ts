import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';
import { buildSubscriptionPayload } from '@/lib/subscription';
import { PLAN_CONFIG, PaidPlan, resolvePaidPlanFromOrder } from '@/lib/plans';
import { fetchRazorpayOrder } from '@/lib/razorpayServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return Response.json(
      { error: { message: 'Razorpay secret not configured' }, success: false },
      { status: 500 }
    );
  }

  let decoded;
  try {
    decoded = await requireUser(req);
  } catch {
    return Response.json(
      { error: { message: 'Not authenticated' }, success: false },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

    console.log('[razorpay/verify] request body received', {
      razorpay_payment_id,
      razorpay_order_id,
      plan,
      razorpay_signature: razorpay_signature ? `${razorpay_signature.slice(0, 8)}...` : null,
      authUserId: decoded?.id,
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    });

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_order_id) {
      return Response.json(
        { error: { message: 'Missing payment fields' }, success: false },
        { status: 400 }
      );
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    const signatureMatches = expected === razorpay_signature;
    console.log('[razorpay/verify] signature verification result', {
      payload,
      expected,
      receivedSignature: razorpay_signature,
      signatureMatches,
    });

    if (!signatureMatches) {
      return Response.json(
        { error: { message: 'Invalid payment signature' }, success: false },
        { status: 400 }
      );
    }

    const db = adminDb();
    const uid = decoded.id;
    console.log('[razorpay/verify] user id used for profile update', { uid, source: 'requireUser(decoded.id)' });

    const { data: existingPayment } = await db
      .from('payments')
      .select('id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) {
      const { data: profile, error: profileLookupError } = await db
        .from('profiles')
        .select('plan, drafts_limit')
        .eq('user_id', uid)
        .maybeSingle();

      console.log('[razorpay/verify] existing payment lookup result', {
        uid,
        profile,
        profileLookupError,
      });

      return Response.json({
        success: true,
        plan: profile?.plan ?? 'pro',
        draftsLimit: profile?.drafts_limit ?? PLAN_CONFIG.pro.draftsLimit,
        alreadyProcessed: true,
      });
    }

    let validPlan: PaidPlan | null = null;
    let planConfig: (typeof PLAN_CONFIG)[PaidPlan] = PLAN_CONFIG.pro;

    const planKeyFromBody = String(plan || 'pro').toLowerCase();
    if (['starter', 'standard', 'pro', 'basic'].includes(planKeyFromBody)) {
      validPlan = (planKeyFromBody === 'basic' ? 'starter' : planKeyFromBody) as PaidPlan;
      planConfig = PLAN_CONFIG[validPlan];
    }

    if (!validPlan) {
      const order = await fetchRazorpayOrder(razorpay_order_id);
      validPlan = resolvePaidPlanFromOrder(order);
      if (!validPlan) {
        return Response.json(
          { error: { message: 'Unsupported or invalid payment order' }, success: false },
          { status: 400 }
        );
      }
      planConfig = PLAN_CONFIG[validPlan as keyof typeof PLAN_CONFIG] as any;
    }

    const { data: currentSub } = await db
      .from('subscriptions')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    const planKey = (validPlan || String(plan || 'pro').toLowerCase()) as PaidPlan;
    const profilePayload = {
      id: uid,
      user_id: uid,
      plan: planKey,
      drafts_limit: planConfig.draftsLimit,
      drafts_used: 0,
      plan_expires_at: null,
      razorpay_payment_id,
      updated_at: new Date().toISOString(),
    };

    console.log('[razorpay/verify] attempting profile upsert with payload', {
      uid,
      profilePayload,
    });

    const { data: updateData, error: updateError } = await db
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })
      .select();

    console.log('[razorpay/verify] profile upsert result', {
      uid,
      data: updateData,
      error: updateError,
    });

    if (updateError) {
      console.error('[razorpay/verify] profile upsert failed with full error', JSON.stringify(updateError, null, 2));
      return NextResponse.json(
        { error: 'Plan update failed', details: updateError },
        { status: 500 }
      );
    }

    const { error: subscriptionError } = await db.from('subscriptions').upsert(
      buildSubscriptionPayload({
        id: uid,
        plan: validPlan,
        drafts_used: 0,
        created_at: currentSub?.created_at ?? new Date().toISOString(),
        chat_day_key: currentSub?.chat_day_key ?? new Date().toISOString(),
        chat_count: currentSub?.chat_count ?? 0,
        drafts_count: currentSub?.drafts_count ?? 0,
        last_reset: new Date().toISOString(),
      }),
      { onConflict: 'id' }
    );

    if (subscriptionError) {
      throw subscriptionError;
    }

    const { error: paymentError } = await db.from('payments').insert([
      {
        user_id: uid,
        razorpay_order_id,
        razorpay_payment_id,
        amount_paise: planConfig.amount,
        status: 'paid',
        type: 'one_time',
        plan: validPlan,
        created_at: new Date().toISOString(),
      },
    ]);

    if (paymentError) {
      throw paymentError;
    }

    return Response.json({ success: true, plan: validPlan, draftsLimit: planConfig.draftsLimit });
  } catch (err) {
    console.error('[razorpay/verify] verification failed', err);
    return Response.json(
      { error: { message: 'Verification failed' }, success: false },
      { status: 500 }
    );
  }
}
