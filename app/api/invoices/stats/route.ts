import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

function parsePeriod(period?: string) {
  switch ((period || "month").toLowerCase()) {
    case "day":
      return { unit: "day", days: 1 } as const;
    case "week":
      return { unit: "week", days: 7 } as const;
    case "month":
    default:
      return { unit: "month", days: 30 } as const;
  }
}

function serializeMoney(value: any) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && "toNumber" in (value as any)) {
    try {
      return (value as any).toNumber();
    } catch {
      /* fallthrough */
    }
  }
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

async function getHandler(
  request: NextRequest,
  authData: { user: any; business?: any }
) {
  try {
    const { user } = authData;
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || undefined;

    // Use businessId from authenticated user
    const businessId = user.businessId;

    if (!businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const { days, unit } = parsePeriod(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Basic totals
    const [totalCount, totalsAgg, paidCount, draftCount, cancelledCount] =
      await Promise.all([
        prisma.invoice.count({
          where: { businessId, createdAt: { gte: since } },
        }),
        prisma.invoice.aggregate({
          _sum: { totalAmount: true, taxAmount: true, subtotalAmount: true },
          where: { businessId, createdAt: { gte: since } },
        }),
        prisma.invoice.count({
          where: {
            businessId,
            createdAt: { gte: since },
            paymentStatus: "PAID" as any,
          },
        }),
        prisma.invoice.count({
          where: {
            businessId,
            createdAt: { gte: since },
            status: "DRAFT" as any,
          },
        }),
        prisma.invoice.count({
          where: {
            businessId,
            createdAt: { gte: since },
            status: "CANCELLED" as any,
          },
        }),
      ]);

    // Time series (group by day)
    const items = await prisma.invoice.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    });

    const seriesMap = new Map<
      string,
      { date: string; count: number; total: number }
    >();
    for (const it of items) {
      const d = new Date(it.createdAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      const prev = seriesMap.get(key) || { date: key, count: 0, total: 0 };
      prev.count += 1;
      prev.total += serializeMoney(it.totalAmount);
      seriesMap.set(key, prev);
    }
    const series = Array.from(seriesMap.values());

    const response = {
      success: true,
      period: unit,
      since: since.toISOString(),
      totals: {
        count: totalCount,
        subtotal: serializeMoney(totalsAgg._sum.subtotalAmount),
        tax: serializeMoney(totalsAgg._sum.taxAmount),
        total: serializeMoney(totalsAgg._sum.totalAmount),
        paidCount,
        draftCount,
        cancelledCount,
      },
      series,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Invoice Stats][GET] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
