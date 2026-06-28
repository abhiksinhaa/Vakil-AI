import { NextResponse } from 'next/server';
import { adminAuth, adminDb, requireUser } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const decoded = await requireUser(req);
    const uid = decoded.id;

    await Promise.all([
      adminDb().from('profiles').delete().eq('id', uid),
      adminDb().from('subscriptions').delete().eq('id', uid),
    ]);

    const authClient = adminAuth() as any;
    if (typeof authClient.admin?.deleteUser === 'function') {
      await authClient.admin.deleteUser(uid);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return new NextResponse(err.message || 'Unauthorized', { status: 401 });
  }
}
