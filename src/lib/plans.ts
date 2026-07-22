export type PaidPlan = 'starter' | 'standard' | 'pro';
export type PlanKey = 'free' | PaidPlan;

export const PLAN_CONFIG = {
  free: { label: 'Free', amount: 0, draftsLimit: 10, planId: '' },
  starter: {
    label: 'Starter',
    amount: 14900,
    draftsLimit: 30,
    planId: process.env.RAZORPAY_PLAN_BASIC || 'plan_TDWCGXaopCTWZw',
  },
  standard: {
    label: 'Standard',
    amount: 19900,
    draftsLimit: 40,
    planId: process.env.RAZORPAY_PLAN_STANDARD || 'plan_TDWJ0fBwA0AmY6',
  },
  pro: {
    label: 'Pro',
    amount: 29900,
    draftsLimit: 100,
    planId: process.env.RAZORPAY_PLAN_PRO || 'plan_TDWJdOwAyauKDY',
  },
} as const;

export const SUBSCRIPTION_MONTHS = 1;

export function normalizePlan(plan?: string | null): PlanKey {
  const key = String(plan || 'free').toLowerCase();
  if (key === 'basic' || key === 'starter') return 'starter';
  if (key === 'standard' || key === 'pro') return key;
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
  const match = receipt.match(/^draftee_(starter|standard|pro)_/);
  return match ? (match[1] as PaidPlan) : null;
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
