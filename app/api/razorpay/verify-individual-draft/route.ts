import crypto from 'crypto';
import { adminDb, requireUser } from '@/lib/supabaseAdmin';
import { fetchRazorpayOrder } from '@/lib/razorpayServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return Response.json({ error: 'Payment service unavailable.' }, { status: 500 });

  let user: { id: string };
  try {
    user = await requireUser(req);
  } catch {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, draftId } = await req.json();
    if (![orderId, paymentId, signature, draftId].every((value) => typeof value === 'string' && value)) {
      return Response.json({ error: 'Missing payment information.' }, { status: 400 });
    }

    const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !crypto.timingSafeEqual(expected, received)) {
      return Response.json({ error: 'Payment signature is invalid.' }, { status: 400 });
    }

    const order = await fetchRazorpayOrder(orderId);
    if (
      order.amount !== 900 ||
      order.currency !== 'INR' ||
      order.status !== 'paid' ||
      order.notes?.purpose !== 'individual_draft_unlock' ||
      order.notes?.userId !== user.id ||
      order.notes?.draftId !== draftId
    ) {
      return Response.json({ error: 'Payment does not match this draft.' }, { status: 400 });
    }

    const db = adminDb();
    const persistPayment = async () => {
      const { error } = await db.from('payments').upsert({
        user_id: user.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount_paise: 900,
        status: 'paid',
        type: 'individual_draft_unlock',
        created_at: new Date().toISOString(),
      }, { onConflict: 'razorpay_payment_id' });
      if (error) throw error;
    };

    const { data: profile } = await db.from('profiles').select('user_type').eq('id', user.id).maybeSingle();
    if (profile?.user_type !== 'individual') {
      return Response.json({ error: 'This payment is only available to individual accounts.' }, { status: 403 });
    }

    const { data: draft } = await db
      .from('drafts')
      .select('id, is_unlocked, generated_draft')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!draft) return Response.json({ error: 'Draft not found.' }, { status: 404 });
    if (draft.is_unlocked) {
      await persistPayment();
      return Response.json({ success: true, draft: draft.generated_draft });
    }

    const { data: lockedContent, error: contentError } = await db
      .from('locked_draft_contents')
      .select('generated_draft')
      .eq('draft_id', draftId)
      .eq('user_id', user.id)
      .single();
    if (contentError || !lockedContent?.generated_draft) {
      throw contentError || new Error('Locked draft content is unavailable.');
    }

    await persistPayment();
    const { error: updateError } = await db
      .from('drafts')
      .update({ is_unlocked: true, unlock_payment_id: paymentId, generated_draft: lockedContent.generated_draft })
      .eq('id', draftId)
      .eq('user_id', user.id)
      .eq('is_unlocked', false);
    if (updateError) throw updateError;

    await db.from('locked_draft_contents').delete().eq('draft_id', draftId).eq('user_id', user.id);
    return Response.json({ success: true, draft: lockedContent.generated_draft });
  } catch (error) {
    console.error('[razorpay/verify-individual-draft]', error);
    return Response.json({ error: 'Payment verification failed.' }, { status: 500 });
  }
}