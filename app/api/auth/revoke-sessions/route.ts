import { NextResponse } from 'next/server';
import { adminAuth, requireUser } from '../../../../src/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const decoded = await requireUser(req);
    await adminAuth().revokeRefreshTokens(decoded.uid);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return new NextResponse(err.message || 'Unauthorized', { status: 401 });
  }
}
