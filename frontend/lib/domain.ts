export const USER_TYPES = [
  "freelancer",
  "founder",
  "creator",
] as const;

export const TASK_TYPES = [
  "client_acquisition",
  "proposal",
  "delivery",
  "communication",
  "admin_finance",
  "strategy",
  "research",
  "build",
  "growth",
  "operations",
  "content_strategy",
  "script",
  "repurpose",
  "monetise",
  "community",
] as const;

export const TASK_STATUSES = [
  "processing",
  "complete",
  "partial",
  "failed",
] as const;

export const MEMORY_CATEGORIES = [
  "client",
  "project",
  "preference",
  "finance",
  "general",
  "decision",
] as const;

export const BILLING_PLANS = [
  "pay_task",
  "starter",
  "pro",
  "agency",
  "starter_annual",
  "pro_annual",
] as const;

export const SUBSCRIPTION_TIERS = [
  "free",
  "starter",
  "pro",
  "agency",
] as const;

export type UserType = (typeof USER_TYPES)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type BillingPlan = (typeof BILLING_PLANS)[number];
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];
export type BillingPeriod = "monthly" | "annual" | "one_time";

export const QUOTA_BY_PLAN: Readonly<Record<BillingPlan, number>> = {
  pay_task: 10,
  starter: 100,
  pro: 300,
  agency: 500,
  starter_annual: 100,
  pro_annual: 300,
};

export const PRICE_ENV_BY_PLAN: Readonly<Record<BillingPlan, string>> = {
  pay_task: "STRIPE_PRICE_PAY_TASK",
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  agency: "STRIPE_PRICE_AGENCY",
  starter_annual: "STRIPE_PRICE_STARTER_ANNUAL",
  pro_annual: "STRIPE_PRICE_PRO_ANNUAL",
};

export function isBillingPlan(value: unknown): value is BillingPlan {
  return (
    typeof value === "string" &&
    (BILLING_PLANS as readonly string[]).includes(value)
  );
}

export function getBillingPeriod(plan: BillingPlan): BillingPeriod {
  if (plan === "pay_task") {
    return "one_time";
  }

  return plan.endsWith("_annual") ? "annual" : "monthly";
}

export function getSubscriptionTier(
  plan: Exclude<BillingPlan, "pay_task">,
): Exclude<SubscriptionTier, "free"> {
  return plan.replace("_annual", "") as Exclude<
    SubscriptionTier,
    "free"
  >;
}
