import crypto from 'crypto';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';
import { buildSubscriptionPayload } from '@/lib/subscription';
import { getPlanExpiry, PLAN_CONFIG, resolvePaidPlanFromOrder, SUBSCRIPTION_MONTHS } from '@/lib/plans';
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { error: { message: 'Missing payment fields' }, success: false },
        { status: 400 }
      );
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return Response.json(
        { error: { message: 'Invalid payment signature' }, success: false },
        { status: 400 }
      );
    }

    const db = adminDb();
    const uid = decoded.id;

    const { data: existingPayment } = await db
      .from('payments')
      .select('id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) {
      const { data: profile } = await db
        .from('profiles')
        .select('plan, drafts_limit')
        .eq('user_id', uid)
        .maybeSingle();
      return Response.json({
        success: true,
        plan: profile?.plan ?? 'pro',
        draftsLimit: profile?.drafts_limit ?? PLAN_CONFIG.pro.draftsLimit,
        alreadyProcessed: true,
      });
    }

    const order = await fetchRazorpayOrder(razorpay_order_id);
    const validPlan = resolvePaidPlanFromOrder(order);

    if (!validPlan) {
      return Response.json(
        { error: { message: 'Unsupported or invalid subscription order' }, success: false },
        { status: 400 }
      );
    }

    const planConfig = PLAN_CONFIG[validPlan];
    const planExpiry = getPlanExpiry(SUBSCRIPTION_MONTHS);

    const { data: currentSub } = await db
      .from('subscriptions')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    const { error: profileError } = await db.from('profiles').update({
      plan: validPlan,
      drafts_limit: planConfig.draftsLimit,
      drafts_used: 0,
      plan_expires_at: planExpiry,
      razorpay_payment_id: razorpay_payment_id,
      updated_at: new Date().toISOString(),
    }).eq('user_id', uid);

    if (profileError) {
      throw profileError;
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
        type: 'subscription',
        plan: validPlan,
        created_at: new Date().toISOString(),
      },
    ]);

    if (paymentError) {
      throw paymentError;
    }

    return Response.json({ success: true, plan: validPlan, draftsLimit: planConfig.draftsLimit });
  } catch (err) {
    console.error('[razorpay/verify]', err);
    return Response.json(
      { error: { message: 'Verification failed' }, success: false },
      { status: 500 }
    );
  }
}
