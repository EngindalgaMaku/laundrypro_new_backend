import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Silinen Siparişler: deleted orders, newest first */
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const rows = await prisma.deletedOrder.findMany({
    where: { businessId: user.businessId },
    orderBy: { deletedAt: "desc" },
    take: 200,
    select: {
      id: true,
      orderId: true,
      orderNumber: true,
      customerName: true,
      totalAmount: true,
      status: true,
      deletedById: true,
      deletedAt: true,
    },
  });
  const userIds = [...new Set(rows.map((r) => r.deletedById).filter(Boolean))] as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const names = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

  return NextResponse.json({
    deletedOrders: rows.map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      deletedBy: r.deletedById ? names.get(r.deletedById) ?? null : null,
    })),
  });
}
