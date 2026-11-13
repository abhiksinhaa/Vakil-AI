export type PaidPlan = 'basic' | 'pro' | 'firm';
export type PlanKey = 'free' | PaidPlan;
export type BillingCycle = 'monthly' | 'annual';

export const PRICING_VERSION = '2026-11-v2';

export const PLAN_CONFIG = {
  free: {
    label: 'Free',
    monthlyAmount: 0,
    annualAmount: 0,
    draftsLimit: 3,
    existingDraftsLimit: 5,
    features: ['3 lifetime drafts', 'Standard generation speed'],
    planId: '',
  },
  basic: {
    label: 'Basic',
    monthlyAmount: 19900,
    annualAmount: 179900,
    draftsLimit: 40,
    existingDraftsLimit: 90,
    features: ['40 drafts/month', 'Draft history', 'PDF downloads'],
    planId: process.env.RAZORPAY_PLAN_BASIC || '',
  },
  pro: {
    label: 'Pro',
    monthlyAmount: 39900,
    annualAmount: 349900,
    draftsLimit: 150,
    existingDraftsLimit: 175,
    features: ['150 drafts/month', 'Draft history', 'PDF downloads', 'Priority generation speed'],
    planId: process.env.RAZORPAY_PLAN_PRO || '',
    isPopular: true,
  },
  firm: {
    label: 'Firm',
    monthlyAmount: 199900,
    annualAmount: 1799900,
    draftsLimit: 500,
    existingDraftsLimit: 500,
    features: ['500 pooled drafts/month', '3 member seats', 'Admin dashboard', 'Priority generation speed'],
    planId: '',
  },
} as const;

export const FIRM_SEAT_CONFIG = {
  monthlyAmount: 29900,
  annualAmount: 29900,
} as const;

export const LEGACY_PLAN_CONFIG = {
  basic: {
    monthlyAmounts: [9900, 14900],
    annualAmounts: [99900, 149900],
    draftsLimit: 90,
  },
  pro: {
    monthlyAmounts: [39900],
    annualAmounts: [399900],
    draftsLimit: 175,
  },
  firm: {
    monthlyAmounts: [99900],
    annualAmounts: [999900],
    draftsLimit: 500,
  },
  firm_seat: {
    monthlyAmounts: [29900],
    annualAmounts: [29900],
  },
} as const;

export const SUBSCRIPTION_MONTHS = 1;

export function normalizePlan(plan?: string | null): PlanKey {
  const key = String(plan || 'free').toLowerCase();
  if (key === 'premium' || key === 'basic') return 'basic';
  if (key === 'pro' || key === 'firm') return key;
  return 'free';
}

export function getPlanConfig(plan?: string | null) {
  return PLAN_CONFIG[normalizePlan(plan)];
}

export function getExistingPlanDraftLimit(plan?: string | null) {
  return getPlanConfig(plan).existingDraftsLimit;
}

export function getPaidPlanFromAmount(amountPaise: number): PaidPlan | null {
  const match = (Object.entries(PLAN_CONFIG) as [PlanKey, (typeof PLAN_CONFIG)[PlanKey]][])
    .find(([key, config]) => key !== 'free' &&
      (config.monthlyAmount === amountPaise || config.annualAmount === amountPaise));
  return match ? match[0] as PaidPlan : null;
}

export function parsePlanFromReceipt(receipt?: string | null): PaidPlan | null {
  if (!receipt) return null;
  const match = receipt.match(/^draftee_(premium|basic|pro|firm)_/);
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
