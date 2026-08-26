export type PaidPlan = 'basic' | 'pro';
export type PlanKey = 'free' | PaidPlan;

export const PLAN_CONFIG = {
  free: { label: 'Free', amount: 0, draftsLimit: 5, planId: '' },
  basic: {
    label: 'Basic',
    amount: 14900,
    draftsLimit: 90,
    planId: process.env.RAZORPAY_PLAN_BASIC || 'plan_TDWCGXaopCTWZw',
  },
  pro: {
    label: 'Pro',
    amount: 39900,
    draftsLimit: 175,
    planId: process.env.RAZORPAY_PLAN_PRO || '',
  },
} as const;

export const SUBSCRIPTION_MONTHS = 1;

export function normalizePlan(plan?: string | null): PlanKey {
  const key = String(plan || 'free').toLowerCase();
  if (key === 'premium' || key === 'basic') return 'basic';
  if (key === 'pro') return 'pro';
  return 'free';
}

export function getPlanConfig(plan?: string | null) {
  return PLAN_CONFIG[normalizePlan(plan)];
}

export function getPaidPlanFromAmount(amountPaise: number): PaidPlan | null {
  const match = (Object.entries(PLAN_CONFIG) as [PlanKey, (typeof PLAN_CONFIG)[PlanKey]][])
    .find(([key, config]) => key !== 'free' && config.amount === amountPaise);
  return match ? (match[0] as PaidPlan) : null;
}

export function parsePlanFromReceipt(receipt?: string | null): PaidPlan | null {
  if (!receipt) return null;
  const match = receipt.match(/^draftee_(premium|basic|pro)_/);
  if (!match) return null;
  return normalizePlan(match[1]) as PaidPlan;
}

export function resolvePaidPlanFromOrder(order: { amount?: number; receipt?: string | null }): PaidPlan | null {
  const fromAmount = getPaidPlanFromAmount(Number(order.amount ?? 0));
  if (fromAmount) return fromAmount;
  return parsePlanFromReceipt(order.receipt);
}

export function getPlanExpiry(months = SUBSCRIPTION_MONTHS) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}
