import { NextResponse } from 'next/server';
import { adminAuth, requireUser } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const decoded = await requireUser(req);
    const authClient = adminAuth() as any;
    if (typeof authClient.admin?.invalidateUser === 'function') {
      await authClient.admin.invalidateUser(decoded.id);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return new NextResponse(err.message || 'Unauthorized', { status: 401 });
  }
}
