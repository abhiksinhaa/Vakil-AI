import 'server-only';
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the service-account JSON (one line) to your env.'
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
  }
}

// Lazy init so `next build` never evaluates the credential at module load.
let cached: App | null = null;
function getAdminApp(): App {
  if (cached) return cached;
  cached = getApps().length ? getApp() : initializeApp({ credential: cert(loadServiceAccount()) });
  return cached;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * Verify the `Authorization: Bearer <idToken>` header and return the decoded user.
 * Throws if missing/invalid — callers map that to a 401.
 */
export async function requireUser(req: Request) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('UNAUTHENTICATED');
  return adminAuth().verifyIdToken(token);
}
