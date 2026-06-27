import { NextResponse } from 'next/server';
import { adminAuth, adminDb, requireUser } from '../../../../src/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const decoded = await requireUser(req);
    const uid = decoded.uid;

    await Promise.all([
      adminDb().doc(`profiles/${uid}`).delete(),
      adminDb().doc(`subscriptions/${uid}`).delete(),
    ]);

    await adminAuth().deleteUser(uid);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return new NextResponse(err.message || 'Unauthorized', { status: 401 });
  }
}
