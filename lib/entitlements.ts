import { prisma } from "@/lib/db";

// Local Plan type to avoid type errors before prisma generate
export type Plan = "FREE" | "PRO";

export type Entitlements = {
  plan: Plan;
  // feature flags
  whatsappProFeatures: boolean;
  routeIntegration: boolean;
  photoLimit: number; // per order, client hint
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "grace_period"]);

const ENTRY_DAYS = 30;
const DAY = 24 * 3600 * 1000;

export type PlanLevel = "DEMO" | "ENTRY" | "PAID" | "RESTRICTED";

/**
 * New sign-ups start at the entry level with everything open; when it runs out they drop to the
 * limits of the FREE plan (restricted mode) instead of being closed. Longer entry periods and
 * paid periods are "manual" subscriptions set from the admin page.
 */
export async function getPlanStatus(businessId: string): Promise<{ plan: Plan; level: PlanLevel; daysLeft: number }> {
  const anyPrisma: any = prisma;
  const [sub, business] = await Promise.all([
    anyPrisma.subscription.findUnique({ where: { businessId } }),
    prisma.business.findUnique({ where: { id: businessId }, select: { isDemo: true, createdAt: true } }),
  ]);
  const now = Date.now();
  const left = (until: Date) => Math.ceil((until.getTime() - now) / DAY);
  if (business?.isDemo) return { plan: "PRO", level: "DEMO", daysLeft: 0 };

  if (sub?.provider === "manual") {
    if (sub.status === "active" && sub.periodEnd && sub.periodEnd.getTime() > now) return { plan: "PRO", level: "PAID", daysLeft: left(sub.periodEnd) };
    if (sub.status === "trialing" && sub.trialEnd && sub.trialEnd.getTime() > now) return { plan: "PRO", level: "ENTRY", daysLeft: left(sub.trialEnd) };
    return { plan: "FREE", level: "RESTRICTED", daysLeft: 0 };
  }
  if (sub?.status && ACTIVE_STATUSES.has(String(sub.status).toLowerCase())) {
    return sub.plan === "PRO" ? { plan: "PRO", level: "PAID", daysLeft: 0 } : { plan: "FREE", level: "RESTRICTED", daysLeft: 0 };
  }
  // Beta: grant PRO if enabled via env
  const grant = String(process.env.BETA_GRANT_PRO || "false").toLowerCase() === "true";
  const until = process.env.BETA_PRO_UNTIL ? new Date(process.env.BETA_PRO_UNTIL) : null;
  if (grant && (!until || isNaN(until.getTime()) || new Date(now) <= until)) return { plan: "PRO", level: "PAID", daysLeft: 0 };

  const entryEnd = new Date((business?.createdAt.getTime() ?? 0) + ENTRY_DAYS * DAY);
  if (entryEnd.getTime() > now) return { plan: "PRO", level: "ENTRY", daysLeft: left(entryEnd) };
  return { plan: "FREE", level: "RESTRICTED", daysLeft: 0 };
}

export async function getPlanForBusiness(businessId: string): Promise<Plan> {
  return (await getPlanStatus(businessId)).plan;
}

export async function getEntitlements(
  businessId: string
): Promise<Entitlements> {
  const plan = await getPlanForBusiness(businessId);
  const isPro = plan === "PRO";
  return {
    plan,
    whatsappProFeatures: isPro,
    routeIntegration: isPro,
    photoLimit: isPro ? 20 : 10,
  };
}

export async function requireProOrThrow(businessId: string) {
  const plan = await getPlanForBusiness(businessId);
  if (plan !== "PRO") {
    const err: any = new Error("Bu özellik için PRO plan gereklidir");
    err.code = "PLAN_REQUIRED";
    throw err;
  }
}
