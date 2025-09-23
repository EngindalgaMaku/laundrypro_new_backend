import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export async function getPlanForBusiness(businessId: string): Promise<Plan> {
  const anyPrisma: any = prisma;
  const sub = await anyPrisma.subscription.findUnique({ where: { businessId } });
  if (!sub) {
    // Beta: grant PRO if enabled via env
    const grant = String(process.env.BETA_GRANT_PRO || "false").toLowerCase() === "true";
    const untilRaw = process.env.BETA_PRO_UNTIL;
    let withinWindow = true;
    if (untilRaw) {
      const until = new Date(untilRaw);
      if (!isNaN(until.getTime())) {
        withinWindow = new Date() <= until;
      }
    }
    if (grant && withinWindow) return "PRO";
    return "FREE";
  }
  if (sub?.status && ACTIVE_STATUSES.has(String(sub.status).toLowerCase())) return sub.plan as Plan;
  return "FREE";
}

export async function getEntitlements(businessId: string): Promise<Entitlements> {
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
