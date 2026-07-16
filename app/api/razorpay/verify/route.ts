import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { adminDb } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAN_LIMITS = {
  starter: 30,
  standard: 40,
  pro: 100,
};

export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keySecret) {
    return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const planKey = String(plan).toLowerCase() as keyof typeof PLAN_LIMITS;
    
    if (!PLAN_LIMITS[planKey]) {
      return NextResponse.json({ error: 'Unsupported plan' }, { status: 400 });
    }

    const draftsLimit = PLAN_LIMITS[planKey];
    const db = adminDb();
    
    // Update profile
    const { error: profileError } = await db
      .from('profiles')
      .update({
        plan: planKey,
        drafts_limit: draftsLimit,
        drafts_used: 0,
        razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Profile update failed:', profileError);
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    // Update subscription
    const { error: subError } = await db
      .from('subscriptions')
      .update({
        plan: planKey,
        drafts_used: 0,
        last_reset: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (subError) {
      console.error('Subscription update failed:', subError);
      // We don't fail the whole request if subscription table update fails but profile succeeded.
    }

    return NextResponse.json({ success: true, plan: planKey, draftsLimit });
  } catch (err: any) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: err?.message || 'Verification failed' }, { status: 500 });
  }
}
