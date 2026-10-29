import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_STATUSES, ORDER_GROUPS, type OrderGroupKey } from "@/lib/order-status";
import { startOfDayTR } from "@/lib/turkey-time";

/** Home board: open work per field-work group, urgent and unpaid counts, and today's figures */
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const businessId = user.businessId;
  const today = startOfDayTR();

  try {
    const [byStatus, urgent, unpaidOrders, createdToday, deliveredToday, paidToday] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: { businessId, status: { in: [...ACTIVE_STATUSES] } },
        _count: { _all: true },
      }),
      prisma.order.count({
        where: { businessId, status: { in: [...ACTIVE_STATUSES] }, priority: { in: ["URGENT", "HIGH"] } },
      }),
      prisma.order.findMany({
        where: { businessId, status: { not: "CANCELLED" }, paymentStatus: { in: ["PENDING", "PARTIAL"] } },
        select: { totalAmount: true, payments: { where: { status: "PAID" }, select: { amount: true } } },
      }),
      prisma.order.count({ where: { businessId, createdAt: { gte: today }, status: { not: "CANCELLED" } } }),
      prisma.orderStatusHistory.count({
        where: { status: "DELIVERED", createdAt: { gte: today }, order: { businessId } },
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", order: { businessId }, OR: [{ paidAt: { gte: today } }, { paidAt: null, createdAt: { gte: today } }] },
        _sum: { amount: true },
      }),
    ]);

    const statusCount = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
    const groups = Object.fromEntries(
      (Object.keys(ORDER_GROUPS) as OrderGroupKey[]).map((key) => [
        key,
        ORDER_GROUPS[key].statuses.reduce((sum, status) => sum + (statusCount[status] || 0), 0),
      ])
    ) as Record<OrderGroupKey, number>;

    let openBalance = 0;
    let unpaidCount = 0;
    for (const order of unpaidOrders) {
      const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(order.totalAmount) - paid;
      if (remaining > 0.01) {
        openBalance += remaining;
        unpaidCount += 1;
      }
    }

    return NextResponse.json({
      groups,
      urgent,
      unpaid: { count: unpaidCount, amount: Number(openBalance.toFixed(2)) },
      today: {
        created: createdToday,
        delivered: deliveredToday,
        collected: Number(Number(paidToday._sum.amount || 0).toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Dashboard board error:", error);
    return NextResponse.json({ error: "Sunucu hatası. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
