import { supabase } from './supabase';

export const FREE_DRAFT_LIMIT = 3;
export const PRO_PRICE_PAISE = 29900;
export const PRO_PRICE_INR = 299;

export function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function isAdvocateProfileComplete(profile) {
  return Boolean(
    profile?.advocate_name?.trim() &&
      profile?.bar_council_number?.trim() &&
      profile?.court_jurisdiction?.trim()
  );
}

export async function ensureUserRecords() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || '',
        referral_code: generateReferralCode(),
      })
      .select()
      .single();
    profile = created;
  }

  let { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub) {
    const { data: created } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'free',
        drafts_this_month: 0,
        month_key: getMonthKey(),
      })
      .select()
      .single();
    sub = created;
  }

  return { profile, subscription: sub };
}

export async function fetchProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureUserRecords();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(updates) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTheme(theme) {
  return updateProfile({ theme });
}

async function normalizeSubscription(sub) {
  const monthKey = getMonthKey();
  if (sub.month_key !== monthKey) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        month_key: monthKey,
        drafts_this_month: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', sub.user_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return sub;
}

export function isProActive(sub) {
  if (!sub) return false;
  if (sub.plan === 'pro' && sub.pro_until) {
    return new Date(sub.pro_until) > new Date();
  }
  return sub.plan === 'pro' && !sub.pro_until;
}

export async function fetchSubscription() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureUserRecords();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return normalizeSubscription(data);
}

export async function checkDraftAllowance() {
  const sub = await fetchSubscription();
  const pro = isProActive(sub);

  if (pro) {
    return {
      allowed: true,
      isPro: true,
      used: sub.drafts_this_month,
      limit: null,
      remaining: null,
    };
  }

  const used = sub.drafts_this_month ?? 0;
  const remaining = Math.max(0, FREE_DRAFT_LIMIT - used);

  return {
    allowed: remaining > 0,
    isPro: false,
    used,
    limit: FREE_DRAFT_LIMIT,
    remaining,
  };
}

export async function incrementDraftUsage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = await fetchSubscription();
  if (isProActive(sub)) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      drafts_this_month: (sub.drafts_this_month ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function activateProPlan(months = 1) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const sub = await fetchSubscription();
  const base =
    sub?.pro_until && new Date(sub.pro_until) > new Date()
      ? new Date(sub.pro_until)
      : new Date();
  const proUntil = new Date(base);
  proUntil.setMonth(proUntil.getMonth() + months);

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'pro',
      pro_until: proUntil.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findUserByReferralCode(code) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, referral_code')
    .eq('referral_code', code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function applyReferralOnSignup(referralCode) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !referralCode?.trim()) return null;

  const referrer = await findUserByReferralCode(referralCode);
  if (!referrer || referrer.user_id === user.id) return null;

  await supabase
    .from('profiles')
    .update({ referred_by: referrer.user_id })
    .eq('user_id', user.id);

  const { error: refError } = await supabase.from('referrals').insert({
    referrer_id: referrer.user_id,
    referred_user_id: user.id,
    status: 'completed',
  });

  if (refError && refError.code !== '23505') {
    console.error('Referral insert error:', refError);
  }

  await supabase.rpc('grant_referral_rewards', { p_referrer_id: referrer.user_id });
  return referrer;
}

export async function fetchReferralStats() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, rewardsEarned: 0, nextRewardAt: 2 };

  const { count, error } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', user.id)
    .eq('status', 'completed');

  if (error) throw error;

  const total = count ?? 0;
  const rewardsEarned = Math.floor(total / 2);
  const nextRewardAt = total % 2 === 0 ? 2 : 1;

  return {
    count: total,
    rewardsEarned,
    referralsUntilReward: nextRewardAt,
  };
}

export function getReferralLink(referralCode) {
  const base = window.location.origin;
  return `${base}/?ref=${referralCode}`;
}
