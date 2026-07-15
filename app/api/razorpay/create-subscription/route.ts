import { requireUser } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireUser(req);
  } catch {
    return Response.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  return Response.json({ error: { message: 'Subscriptions are disabled. Please use one-time Razorpay orders.' } }, { status: 410 });
}
