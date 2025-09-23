import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth";



import { prisma } from "@/lib/db";
async function assertIsAdmin(request: NextRequest) {
  const token = getUserFromRequest(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw new Error("UNAUTHORIZED");
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = user.role === "OWNER" || (user.email && adminEmails.includes(user.email));
  if (!isAdmin) throw new Error("FORBIDDEN");
  return user;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
