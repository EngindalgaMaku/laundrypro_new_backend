import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/rbac/middleware";

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
  if (typeof value === "object" && value !== null && "toNumber" in (value as any)) {
    try { return (value as any).toNumber(); } catch { /* ignore */ }
  }
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

async function handler(request: NextRequest) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || undefined;

  // Extract businessId from path
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const businessId = segments[segments.length - 1];

  if (!businessId) {
    return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
  }

  if (businessId.length < 20) {
    return NextResponse.json({ error: "Invalid Business ID format" }, { status: 400 });
  }

  try {
    const { days, unit } = parsePeriod(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalCount, totalsAgg, paidCount, draftCount, cancelledCount] = await Promise.all([
      prisma.invoice.count({ where: { businessId, createdAt: { gte: since } } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true, taxAmount: true, subtotalAmount: true },
        where: { businessId, createdAt: { gte: since } },
      }),
      prisma.invoice.count({ where: { businessId, createdAt: { gte: since }, paymentStatus: "PAID" as any } }),
      prisma.invoice.count({ where: { businessId, createdAt: { gte: since }, status: "DRAFT" as any } }),
      prisma.invoice.count({ where: { businessId, createdAt: { gte: since }, status: "CANCELLED" as any } }),
    ]);

    const items = await prisma.invoice.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    });

    const seriesMap = new Map<string, { date: string; count: number; total: number }>();
    for (const it of items) {
      const d = new Date(it.createdAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
      const prev = seriesMap.get(key) || { date: key, count: 0, total: 0 };
      prev.count += 1;
      prev.total += serializeMoney(it.totalAmount);
      seriesMap.set(key, prev);
    }

    const series = Array.from(seriesMap.values());

    return NextResponse.json({
      success: true,
      period: unit,
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
    });
  } catch (error: any) {
    console.error("[Invoice Stats][GET path] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withAuth(handler);
