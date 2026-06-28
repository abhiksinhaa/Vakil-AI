import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'missing-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'missing.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'missing.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'missing-app-id',
};

const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => typeof value === 'string' && /missing|your_|placeholder/i.test(value))
  .map(([key]) => key);

if (missingConfigKeys.length > 0) {
  console.warn('Firebase config is incomplete. Update .env.local with real values.', {
    missingConfigKeys,
    projectId: firebaseConfig.projectId,
  });
}

if (typeof window !== 'undefined') {
  console.info('Firebase init config', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    appId: firebaseConfig.appId === 'missing-app-id' ? 'missing' : 'configured',
  });
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
