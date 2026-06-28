import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
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
      profile?.bar_council_number?.trim() &&
      profile?.court_jurisdiction?.trim()
  );
}

async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('Supabase getCurrentUser failed', error.message);
    return null;
  }
  return data.user;
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
    user_type: userType || 'advocate',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function ensureUserRecords(userType?: 'advocate' | 'individual') {
  const user = await getCurrentUser();
  if (!user) return null;

  const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  let profile = profileRes.data as Profile | null;

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
    const newSub: Subscription = {
      id: user.id,
      user_id: user.id,
      plan: 'free',
      pro_until: null,
      drafts_this_month: 0,
      month_key: getMonthKey(),
      referral_rewards_granted: 0,
      chat_messages_today: 0,
      chat_day_key: getDayKey(),
      paid_drafts_balance: 0,
      updated_at: new Date().toISOString(),
    };
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
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    console.error('fetchProfile failed', error);
    return null;
  }
  return data as Profile | null;
}

export async function updateProfile(updates: Partial<Profile>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('profiles').update(cleanUpdates).eq('id', user.id).select().maybeSingle();
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
  const monthKey = getMonthKey();
  const dayKey = getDayKey();
  const updates: Partial<Subscription> = {};

  if (sub.month_key !== monthKey) {
    updates.month_key = monthKey;
  }
  if (sub.chat_day_key !== dayKey) {
    updates.chat_day_key = dayKey;
    updates.chat_messages_today = 0;
  }
  if (Object.keys(updates).length === 0) return sub;

  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('subscriptions').update(updates).eq('id', sub.user_id).select().maybeSingle();
  if (error) {
    console.error('normalizeSubscription failed', error);
    return sub;
  }
  return data as Subscription;
}

export function isProActive(sub: Subscription | null) {
  if (!sub) return false;
  if (sub.plan === 'pro' && sub.pro_until) {
    return new Date(sub.pro_until) > new Date();
  }
  return sub.plan === 'pro' && !sub.pro_until;
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
  const sub = await fetchSubscription();
  const profile = await fetchProfile();
  const isAdvocate = profile?.user_type !== 'individual';
  const limit = isAdvocate ? FREE_DRAFT_LIMIT : 2;
  const pro = isProActive(sub);

  if (pro && isAdvocate) {
    return {
      allowed: true,
      isPro: true,
      used: sub!.drafts_this_month,
      limit: null,
      remaining: null,
      userType: profile?.user_type || 'advocate',
    };
  }

  const used = sub?.drafts_this_month ?? 0;
  const remaining = Math.max(0, limit - used);
  const paidBalance = sub?.paid_drafts_balance ?? 0;
  const allowed = isAdvocate ? remaining > 0 || paidBalance > 0 : true;
  return { allowed, isPro: false, used, limit, remaining, userType: profile?.user_type || 'advocate' };
}

export async function incrementDraftUsage() {
  const user = await getCurrentUser();
  if (!user) return;
  const sub = await fetchSubscription();
  const profile = await fetchProfile();
  const isAdvocate = profile?.user_type !== 'individual';

  if (isProActive(sub) && isAdvocate) return;

  const limit = isAdvocate ? FREE_DRAFT_LIMIT : 2;
  const used = sub?.drafts_this_month ?? 0;
  const remaining = Math.max(0, limit - used);

  if (remaining > 0) {
    const { error } = await supabase.from('subscriptions').update({ drafts_this_month: used + 1, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) throw error;
  } else if ((sub?.paid_drafts_balance ?? 0) > 0) {
    const { error } = await supabase.from('subscriptions').update({ paid_drafts_balance: (sub?.paid_drafts_balance ?? 0) - 1, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) throw error;
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
  const user = await getCurrentUser();
  if (!user) return;
  const sub = await fetchSubscription();
  if (isProActive(sub)) return;
  const { error } = await supabase.from('subscriptions').update({ chat_messages_today: (sub?.chat_messages_today ?? 0) + 1, updated_at: new Date().toISOString() }).eq('id', user.id);
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
