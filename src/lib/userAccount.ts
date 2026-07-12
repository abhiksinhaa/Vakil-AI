import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Subscription } from './types';
import { buildSubscriptionPayload } from './subscription';

export const FREE_DRAFT_LIMIT = 10;
export const FREE_CHAT_DAILY_LIMIT = 5;
export const DAILY_DRAFT_LIMIT = 3;
export const DAILY_DRAFT_LIMIT_MESSAGE = 'You have reached your daily limit of 3 drafts. Come back tomorrow for more.';
export const PRO_PRICE_PAISE = 9900;
export const PRO_PRICE_INR = 99;



function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function generateUniqueReferralCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = generateReferralCode();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referral_code', code)
      .limit(1);
    if (error) {
      console.warn('Referral code uniqueness check failed', error);
      return code;
    }
    if (!count) return code;
  }
  return generateReferralCode();
}

export function isAdvocateProfileComplete(profile: Partial<Profile> | null) {
  return Boolean(
    profile?.advocate_name?.trim() &&
      profile?.court_jurisdiction?.trim()
  );
}

export function isIndividualProfileComplete(profile: Partial<Profile> | null) {
  const hasName = Boolean(profile?.full_name?.trim());
  const hasLocation = Boolean(profile?.city?.trim() || profile?.state?.trim());
  return hasName && hasLocation;
}

export function isUserProfileComplete(profile: Partial<Profile> | null) {
  const isAdvocate = profile?.user_type !== 'individual';
  return isAdvocate ? isAdvocateProfileComplete(profile) : isIndividualProfileComplete(profile);
}

async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('Supabase getCurrentUser failed', error.message);
    return null;
  }
  return data.user;
}

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getDailyDraftState(profile: Partial<Profile> | null | undefined) {
  const today = getTodayKey();
  const lastDraftDate = profile?.last_draft_date ? String(profile.last_draft_date).slice(0, 10) : null;
  const count = Number(profile?.daily_draft_count ?? 0);
  const normalizedCount = Number.isFinite(count) ? count : 0;
  const shouldReset = lastDraftDate !== today;
  return {
    today,
    lastDraftDate,
    count: shouldReset ? 0 : normalizedCount,
    shouldReset,
  };
}

async function getProfileRow(userId: string): Promise<Profile | null> {
  const { data: byUserId, error: userIdError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (userIdError) {
    console.warn('Profile lookup by user_id failed', userIdError);
  }
  if (byUserId) return byUserId as Profile;

  const { data: byId, error: idError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (idError) {
    console.warn('Profile lookup by id failed', idError);
  }
  return byId as Profile | null;
}

async function getIdToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token ?? null;
}

async function defaultProfileValues(user: User, userType?: 'advocate' | 'individual'): Promise<Partial<Profile>> {
  return {
    id: user.id,
    user_id: user.id,
    full_name: (user.user_metadata?.full_name as string) || '',
    advocate_name: '',
    bar_council_number: '',
    court_jurisdiction: '',
    referral_code: await generateUniqueReferralCode(),
    referred_by: null,
    theme: 'dark',
    language: 'English',
    preferred_draft_language: 'English',
    user_type: userType || 'advocate',
    daily_draft_count: 0,
    last_draft_date: getTodayKey(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function ensureUserRecords(userType?: 'advocate' | 'individual') {
  const user = await getCurrentUser();
  if (!user) return null;

  let profile = await getProfileRow(user.id);

  if (!profile) {
    const newProfile = await defaultProfileValues(user, userType);
    const insertProfile = await supabase.from('profiles').insert(newProfile);
    if (insertProfile.error) {
      console.error('ensureUserRecords: failed to insert profile', insertProfile.error);
      throw insertProfile.error;
    }
    profile = { ...(newProfile as Profile) };
  }

  const subRes = await supabase.from('subscriptions').select('*').eq('id', user.id).maybeSingle();
  let subscription = subRes.data as Subscription | null;

  if (!subscription) {
    const newSub = buildSubscriptionPayload({ id: user.id, plan: 'free' }) as Subscription;
    const insertSub = await supabase.from('subscriptions').insert(newSub);
    if (insertSub.error) {
      console.error('ensureUserRecords: failed to insert subscription', insertSub.error);
      throw insertSub.error;
    }
    subscription = newSub;
  }

  return { profile, subscription };
}

export async function fetchProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserRecords();
  return getProfileRow(user.id);
}

export async function updateProfile(updates: Partial<Profile>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
  const profilePayload = {
    id: user.id,
    user_id: user.id,
    ...cleanUpdates,
  } as Partial<Profile>;

  console.log('Saving profile payload:', profilePayload);

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  console.log('Profile save response:', { data, error });

  if (error) {
    console.error('updateProfile failed', error);
    throw error;
  }
  return data as Profile;
}

export async function updateTheme(theme: 'dark' | 'light') {
  return updateProfile({ theme });
}

async function normalizeSubscription(sub: Subscription): Promise<Subscription> {
  const now = new Date();
  const updates: Partial<Subscription> = {};

  const lastReset = sub.last_reset ? new Date(sub.last_reset) : new Date(0);
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    updates.last_reset = now.toISOString();
    updates.drafts_used = 0;
  }
  
  const lastChat = sub.chat_day_key ? new Date(sub.chat_day_key) : new Date(0);
  if (lastChat.getDate() !== now.getDate() || lastChat.getMonth() !== now.getMonth() || lastChat.getFullYear() !== now.getFullYear()) {
    updates.chat_day_key = now.toISOString();
    updates.chat_count = 0;
  }
  
  if (Object.keys(updates).length === 0) return sub;

  const { data, error } = await supabase.from('subscriptions').update(updates).eq('id', sub.id).select().maybeSingle();
  if (error) {
    console.error('normalizeSubscription failed', error);
    return sub;
  }
  return data as Subscription;
}

export function isProActive(sub: Subscription | null) {
  if (!sub) return false;
  return sub.plan === 'pro';
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserRecords();
  const { data, error } = await supabase.from('subscriptions').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    console.error('fetchSubscription failed', error);
    return null;
  }
  return data ? normalizeSubscription(data as Subscription) : null;
}

export async function checkDraftAllowance() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      allowed: false,
      isPro: false,
      reason: 'unauthenticated',
      message: null,
      used: 0,
      limit: DAILY_DRAFT_LIMIT,
      remaining: 0,
      userType: 'advocate',
    };
  }

  const sub = await fetchSubscription();
  const profile = await fetchProfile();
  const isAdvocate = profile?.user_type !== 'individual';
  const freeLimit = isAdvocate ? FREE_DRAFT_LIMIT : 2;
  const pro = isProActive(sub);
  const dailyState = getDailyDraftState(profile);

  if (dailyState.shouldReset) {
    await supabase
      .from('profiles')
      .update({ daily_draft_count: 0, last_draft_date: dailyState.today, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  }

  if (dailyState.count >= DAILY_DRAFT_LIMIT) {
    return {
      allowed: false,
      isPro: pro,
      reason: 'daily_limit',
      message: DAILY_DRAFT_LIMIT_MESSAGE,
      used: dailyState.count,
      limit: DAILY_DRAFT_LIMIT,
      remaining: 0,
      userType: profile?.user_type || 'advocate',
    };
  }

  if (pro && isAdvocate) {
    return {
      allowed: true,
      isPro: true,
      reason: 'ok',
      message: null,
      used: sub!.drafts_used,
      limit: null,
      remaining: null,
      userType: profile?.user_type || 'advocate',
    };
  }

  const used = sub?.drafts_used ?? 0;
  const freeRemaining = Math.max(0, freeLimit - used);
  const paidBalance = sub?.drafts_count ?? 0;
  const totalRemaining = freeRemaining + paidBalance;

  return {
    allowed: totalRemaining > 0,
    isPro: false,
    reason: totalRemaining > 0 ? 'ok' : 'subscription_limit',
    message: totalRemaining > 0 ? null : 'Your free draft quota has been used. Upgrade to continue.',
    used,
    limit: freeLimit,
    remaining: totalRemaining,
    userType: profile?.user_type || 'advocate',
  };
}

export async function consumeDraftAllowance() {
  const allowance = await checkDraftAllowance();
  if (!allowance.allowed) {
    return allowance;
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ...allowance,
      allowed: false,
      reason: 'unauthenticated',
      message: null,
    };
  }

  const profile = await fetchProfile();
  const dailyState = getDailyDraftState(profile);
  const nextCount = (dailyState.shouldReset ? 0 : dailyState.count) + 1;
  const { error } = await supabase
    .from('profiles')
    .update({
      daily_draft_count: nextCount,
      last_draft_date: dailyState.today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) throw error;

  return {
    ...allowance,
    allowed: true,
    dailyCount: nextCount,
    reason: 'ok',
  };
}

export async function incrementDraftUsage() {
  const user = await getCurrentUser();
  if (!user) return;
  const sub = await fetchSubscription();
  const profile = await fetchProfile();
  const isAdvocate = profile?.user_type !== 'individual';

  if (isProActive(sub) && isAdvocate) return;

  const freeLimit = isAdvocate ? FREE_DRAFT_LIMIT : 2;
  const used = sub?.drafts_used ?? 0;

  if (used < freeLimit) {
    const { error } = await supabase.from('subscriptions').update({ drafts_used: used + 1 }).eq('id', user.id);
    if (error) throw error;
  } else if ((sub?.drafts_count ?? 0) > 0) {
    const { error } = await supabase.from('subscriptions').update({ drafts_count: (sub.drafts_count) - 1 }).eq('id', user.id);
    if (error) throw error;
  }

  const dailyState = getDailyDraftState(profile);
  const nextCount = (dailyState.shouldReset ? 0 : dailyState.count) + 1;
  const { error: dailyError } = await supabase
    .from('profiles')
    .update({
      daily_draft_count: nextCount,
      last_draft_date: dailyState.today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (dailyError) throw dailyError;
}

export async function checkChatAllowance() {
  const sub = await fetchSubscription();
  const pro = isProActive(sub);

  if (pro) {
    return { allowed: true, isPro: true, used: sub!.chat_count ?? 0, limit: null, remaining: null };
  }

  const used = sub?.chat_count ?? 0;
  const remaining = Math.max(0, FREE_CHAT_DAILY_LIMIT - used);
  return { allowed: remaining > 0, isPro: false, used, limit: FREE_CHAT_DAILY_LIMIT, remaining };
}

export async function incrementChatUsage() {
  const user = await getCurrentUser();
  if (!user) return;
  const sub = await fetchSubscription();
  if (isProActive(sub)) return;
  const { error } = await supabase.from('subscriptions').update({ chat_count: (sub?.chat_count ?? 0) + 1 }).eq('id', user.id);
  if (error) throw error;
}

export async function findUserByReferralCode(code: string) {
  if (!code?.trim()) return null;
  const { data, error } = await supabase.from('profiles').select('id, referral_code').eq('referral_code', code.trim().toUpperCase()).maybeSingle();
  if (error) {
    console.error('findUserByReferralCode failed', error);
    return null;
  }
  if (!data) return null;
  return { user_id: data.id as string, referral_code: data.referral_code as string };
}

export async function applyReferralOnSignup(referralCode: string) {
  if (!referralCode?.trim()) return null;
  const token = await getIdToken();
  if (!token) return null;
  const res = await fetch('/api/referrals/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ referralCode: referralCode.trim().toUpperCase() }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchReferralStats() {
  const user = await getCurrentUser();
  if (!user) return { count: 0, rewardsEarned: 0, referralsUntilReward: 5 };

  const { count, error } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', user.id)
    .eq('status', 'completed');
  if (error) {
    console.error('fetchReferralStats failed', error);
    return { count: 0, rewardsEarned: 0, referralsUntilReward: 5 };
  }

  const total = count ?? 0;
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
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('advocate_name, full_name').eq('id', user.id).maybeSingle();
  const advocateName = profile?.advocate_name || profile?.full_name || '';
  if (profileError) console.warn('submitFeedback profile lookup failed', profileError);

  const { error } = await supabase.from('feedback').insert([
    {
      user_id: user.id,
      user_email: user.email,
      advocate_name: advocateName,
      feedback_type: feedbackData.type,
      subject: feedbackData.subject,
      description: feedbackData.description,
      rating: feedbackData.rating,
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    console.error('submitFeedback failed', error);
    throw error;
  }
}

export async function submitDraftFeedback(feedbackData: {
  user_id: string;
  rating: number;
  comment: string | null;
  draft_type: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('advocate_name, full_name').eq('id', user.id).maybeSingle();
  const advocateName = profile?.advocate_name || profile?.full_name || '';
  if (profileError) console.warn('submitDraftFeedback profile lookup failed', profileError);

  const { error } = await supabase.from('feedback').insert([
    {
      user_id: user.id,
      user_email: user.email,
      advocate_name: advocateName,
      feedback_type: 'Draft Generation',
      subject: `Draft Quality: ${feedbackData.draft_type}`,
      description: feedbackData.comment || '',
      rating: feedbackData.rating,
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    console.error('submitDraftFeedback failed', error);
    throw error;
  }
}

export async function revokeAllSessions() {
  const token = await getIdToken();
  const res = await fetch('/api/auth/revoke-sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Unable to sign out all devices.');
  }
  return res.json();
}

export async function deleteUserAccount() {
  const token = await getIdToken();
  const res = await fetch('/api/auth/delete-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Unable to delete account.');
  }
  return res.json();
}
