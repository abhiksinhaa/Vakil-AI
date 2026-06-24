import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Profile, Subscription } from './types';

export const FREE_DRAFT_LIMIT = 10;
export const FREE_CHAT_DAILY_LIMIT = 5;
export const PRO_PRICE_PAISE = 9900;
export const PRO_PRICE_INR = 99;

export function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function generateUniqueReferralCode() {
  // Collisions are astronomically unlikely; cap the loop just in case.
  for (let i = 0; i < 5; i += 1) {
    const code = generateReferralCode();
    const exists = await getDoc(doc(db, 'referralCodes', code));
    if (!exists.exists()) return code;
  }
  return generateReferralCode();
}

export function isAdvocateProfileComplete(profile: Partial<Profile> | null) {
  return Boolean(
    profile?.advocate_name?.trim() &&
      profile?.bar_council_number?.trim() &&
      profile?.court_jurisdiction?.trim()
  );
}

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

/** Creates profile + subscription + referral-code mapping on first sign-in. */
export async function ensureUserRecords(userType?: 'advocate' | 'individual') {
  const user = auth.currentUser;
  if (!user) return null;

  const profileRef = doc(db, 'profiles', user.uid);
  let profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    const referralCode = await generateUniqueReferralCode();
    await setDoc(profileRef, {
      user_id: user.uid,
      full_name: user.displayName || '',
      advocate_name: '',
      bar_council_number: '',
      court_jurisdiction: '',
      referral_code: referralCode,
      referred_by: null,
      theme: 'dark',
      user_type: userType || 'advocate',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    await setDoc(doc(db, 'referralCodes', referralCode), {
      uid: user.uid,
      created_at: serverTimestamp(),
    });
    profileSnap = await getDoc(profileRef);
  }

  const subRef = doc(db, 'subscriptions', user.uid);
  let subSnap = await getDoc(subRef);

  if (!subSnap.exists()) {
    await setDoc(subRef, {
      user_id: user.uid,
      plan: 'free',
      pro_until: null,
      drafts_this_month: 0,
      month_key: getMonthKey(),
      referral_rewards_granted: 0,
      chat_messages_today: 0,
      chat_day_key: getDayKey(),
      paid_drafts_balance: 0,
      updated_at: serverTimestamp(),
    });
    subSnap = await getDoc(subRef);
  }

  return {
    profile: profileSnap.data() as Profile,
    subscription: subSnap.data() as Subscription,
  };
}

export async function fetchProfile(): Promise<Profile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await ensureUserRecords();
  const snap = await getDoc(doc(db, 'profiles', user.uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export async function updateProfile(updates: Partial<Profile>) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const ref = doc(db, 'profiles', user.uid);
  await updateDoc(ref, { ...updates, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return snap.data() as Profile;
}

export async function updateTheme(theme: 'dark' | 'light') {
  return updateProfile({ theme });
}

async function normalizeSubscription(sub: Subscription): Promise<Subscription> {
  const monthKey = getMonthKey();
  const dayKey = getDayKey();
  const needsMonthReset = sub.month_key !== monthKey;
  const needsDayReset = sub.chat_day_key !== dayKey;

  if (needsMonthReset || needsDayReset) {
    const updates: Record<string, unknown> = { updated_at: serverTimestamp() };
    if (needsMonthReset) {
      updates.month_key = monthKey;
      // We no longer reset drafts_this_month because it's now a lifetime limit
    }
    if (needsDayReset) {
      updates.chat_day_key = dayKey;
      updates.chat_messages_today = 0;
    }
    const ref = doc(db, 'subscriptions', sub.user_id);
    await updateDoc(ref, updates);
    return { ...sub, ...updates } as Subscription;
  }
  return sub;
}

export function isProActive(sub: Subscription | null) {
  if (!sub) return false;
  if (sub.plan === 'pro' && sub.pro_until) {
    return new Date(sub.pro_until) > new Date();
  }
  return sub.plan === 'pro' && !sub.pro_until;
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await ensureUserRecords();
  const snap = await getDoc(doc(db, 'subscriptions', user.uid));
  if (!snap.exists()) return null;
  return normalizeSubscription(snap.data() as Subscription);
}

export async function checkDraftAllowance() {
  const sub = await fetchSubscription();
  const profile = await fetchProfile();
  const isAdvocate = profile?.user_type !== 'individual';
  const limit = isAdvocate ? FREE_DRAFT_LIMIT : 2;
  const pro = isProActive(sub);

  if (pro && isAdvocate) {
    return { allowed: true, isPro: true, used: sub!.drafts_this_month, limit: null, remaining: null, userType: profile?.user_type || 'advocate' };
  }

  const used = sub?.drafts_this_month ?? 0;
  const remaining = Math.max(0, limit - used);
  const paidBalance = sub?.paid_drafts_balance ?? 0;
  
  // Individual users can always generate
  const allowed = isAdvocate ? (remaining > 0 || paidBalance > 0) : true;
  
  return { allowed, isPro: false, used, limit, remaining, userType: profile?.user_type || 'advocate' };
}

export async function incrementDraftUsage() {
  const user = auth.currentUser;
  if (!user) return;
  const sub = await fetchSubscription();
  const profile = await fetchProfile();
  const isAdvocate = profile?.user_type !== 'individual';
  
  if (isProActive(sub) && isAdvocate) return;
  
  const limit = isAdvocate ? FREE_DRAFT_LIMIT : 2;
  const used = sub?.drafts_this_month ?? 0;
  const remaining = Math.max(0, limit - used);
  
  if (remaining > 0) {
    await updateDoc(doc(db, 'subscriptions', user.uid), {
      drafts_this_month: used + 1,
      updated_at: serverTimestamp(),
    });
  } else if ((sub?.paid_drafts_balance ?? 0) > 0) {
    await updateDoc(doc(db, 'subscriptions', user.uid), {
      paid_drafts_balance: (sub?.paid_drafts_balance ?? 0) - 1,
      updated_at: serverTimestamp(),
    });
  }
}

export async function checkChatAllowance() {
  const sub = await fetchSubscription();
  const pro = isProActive(sub);

  if (pro) {
    return { allowed: true, isPro: true, used: sub!.chat_messages_today ?? 0, limit: null, remaining: null };
  }

  const used = sub?.chat_messages_today ?? 0;
  const remaining = Math.max(0, FREE_CHAT_DAILY_LIMIT - used);
  return { allowed: remaining > 0, isPro: false, used, limit: FREE_CHAT_DAILY_LIMIT, remaining };
}

export async function incrementChatUsage() {
  const user = auth.currentUser;
  if (!user) return;
  const sub = await fetchSubscription();
  if (isProActive(sub)) return;
  await updateDoc(doc(db, 'subscriptions', user.uid), {
    chat_messages_today: (sub?.chat_messages_today ?? 0) + 1,
    updated_at: serverTimestamp(),
  });
}

export async function findUserByReferralCode(code: string) {
  const snap = await getDoc(doc(db, 'referralCodes', code.trim().toUpperCase()));
  if (!snap.exists()) return null;
  return { user_id: snap.data().uid as string, referral_code: code.trim().toUpperCase() };
}

/** Server-side via Admin SDK: writes the referral and grants rewards atomically. */
export async function applyReferralOnSignup(referralCode: string) {
  if (!referralCode?.trim()) return null;
  const token = await getIdToken();
  const res = await fetch('/api/referrals/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ referralCode: referralCode.trim().toUpperCase() }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchReferralStats() {
  const user = auth.currentUser;
  if (!user) return { count: 0, rewardsEarned: 0, referralsUntilReward: 5 };

  const q = query(
    collection(db, 'referrals'),
    where('referrer_id', '==', user.uid),
    where('status', '==', 'completed')
  );

  let total = 0;
  try {
    const countSnap = await getCountFromServer(q);
    total = countSnap.data().count;
  } catch {
    const snap = await getDocs(q);
    total = snap.size;
  }

  const rewardsEarned = Math.floor(total / 5) * 2;
  const nextRewardAt = 5 - (total % 5);
  return { count: total, rewardsEarned, referralsUntilReward: nextRewardAt };
}

export function getReferralLink(referralCode: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://draftee.in';
  return `${base}/?ref=${referralCode}`;
}

export async function submitFeedback(feedbackData: {
  type: string;
  subject: string;
  description: string;
  rating: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  let advocateName = '';
  try {
    const snap = await getDoc(doc(db, 'profiles', user.uid));
    const p = snap.data() as Profile | undefined;
    advocateName = p?.advocate_name || p?.full_name || '';
  } catch {
    /* non-fatal */
  }

  await addDoc(collection(db, 'feedback'), {
    user_id: user.uid,
    user_email: user.email,
    advocate_name: advocateName,
    feedback_type: feedbackData.type,
    subject: feedbackData.subject,
    description: feedbackData.description,
    rating: feedbackData.rating,
    created_at: serverTimestamp(),
  });
}
