import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth";
import { getPlanStatus } from "@/lib/entitlements";



import { prisma } from "@/lib/db";
async function assertIsAdmin(request: NextRequest) {
  const token = getUserFromRequest(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw new Error("UNAUTHORIZED");
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  // System admins only (ADMIN_EMAILS); role OWNER is every business owner, not an admin
  const isAdmin = !!(user.email && adminEmails.includes(user.email));
  if (!isAdmin) throw new Error("FORBIDDEN");
  return user;
}

/** The buttons on the detail page: longer entry level, a paid period, or restricted mode */
export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id: businessId } = await paramsPromise;
  try {
    await assertIsAdmin(request);
    const { action } = await request.json().catch(() => ({ action: "" }));
    const business = await prisma.business.findFirst({ where: { id: businessId, isDemo: false }, select: { id: true } });
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = prisma as any;
    const now = new Date();
    const sub = await db.subscription.findUnique({ where: { businessId } });
    const manual = sub?.provider === "manual" ? sub : null;
    const later = (from: Date | null | undefined, days: number) => new Date(Math.max(from?.getTime() ?? 0, now.getTime()) + days * 864e5);
    const status = await getPlanStatus(businessId);
    const data =
      action === "entry30"
        ? { plan: "PRO", status: "trialing", trialEnd: later(status.level === "ENTRY" ? new Date(now.getTime() + status.daysLeft * 864e5) : null, 30), periodEnd: null }
        : action === "paid30"
          ? { plan: "PRO", status: "active", periodEnd: later(manual?.periodEnd, 30), trialEnd: null }
          : action === "paid365"
            ? { plan: "PRO", status: "active", periodEnd: later(manual?.periodEnd, 365), trialEnd: null }
            : action === "restrict"
              ? { plan: "FREE", status: "canceled", periodEnd: null, trialEnd: null }
              : null;
    if (!data) return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    await db.subscription.upsert({
      where: { businessId },
      update: { ...data, provider: "manual" },
      create: { businessId, provider: "manual", ...data },
    });
    return NextResponse.json({ success: true, ...(await getPlanStatus(businessId)) });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin business plan error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    await assertIsAdmin(request);
    const businessId = params.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        district: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [users, recentOrders, subscription] = await Promise.all([
      prisma.user.findMany({ where: { businessId }, select: { id: true, email: true, firstName: true, lastName: true, role: true } }),
      prisma.order.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          totalAmount: true,
          status: true,
        },
      }),
      (prisma as any).subscription.findUnique({ where: { businessId } })
    ]);

    return NextResponse.json({ success: true, business, subscription, users, recentOrders });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin business detail error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }}
