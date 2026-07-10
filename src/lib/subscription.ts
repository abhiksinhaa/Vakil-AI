import type { Subscription } from './types';

export type SubscriptionPayload = Pick<
  Subscription,
  'id' | 'plan' | 'drafts_used' | 'created_at' | 'chat_day_key' | 'chat_count' | 'drafts_count' | 'last_reset'
>;

export function buildSubscriptionPayload(overrides: Partial<SubscriptionPayload> = {}): SubscriptionPayload {
  const now = new Date().toISOString();

  return {
    id: overrides.id,
    plan: overrides.plan ?? 'free',
    drafts_used: overrides.drafts_used ?? 0,
    created_at: overrides.created_at ?? now,
    chat_day_key: overrides.chat_day_key ?? now,
    chat_count: overrides.chat_count ?? 0,
    drafts_count: overrides.drafts_count ?? 0,
    last_reset: overrides.last_reset ?? now,
  };
}

export function buildSubscriptionUpdatePayload(overrides: Partial<SubscriptionPayload> = {}): Partial<SubscriptionPayload> {
  const payload: Partial<SubscriptionPayload> = {};

  if (overrides.plan !== undefined) payload.plan = overrides.plan;
  if (overrides.drafts_used !== undefined) payload.drafts_used = overrides.drafts_used;
  if (overrides.created_at !== undefined) payload.created_at = overrides.created_at;
  if (overrides.chat_day_key !== undefined) payload.chat_day_key = overrides.chat_day_key;
  if (overrides.chat_count !== undefined) payload.chat_count = overrides.chat_count;
  if (overrides.drafts_count !== undefined) payload.drafts_count = overrides.drafts_count;
  if (overrides.last_reset !== undefined) payload.last_reset = overrides.last_reset;

  return payload;
}
