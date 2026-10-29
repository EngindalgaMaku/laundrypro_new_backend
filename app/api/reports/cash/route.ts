import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCashBook } from "@/lib/expenses";
import { addDays, dayKeyTR, monthKeyTR, parseDayTR, startOfDayTR } from "@/lib/turkey-time";

type Period = "day" | "month" | "year";

const round = (n: number) => Number(n.toFixed(2));

/** Start (inclusive), end (exclusive) and series buckets for the requested period */
function periodRange(period: Period, value: string | null) {
  const today = dayKeyTR(new Date());
  if (period === "day") {
    const start = parseDayTR(value || today);
    return start ? { start, end: addDays(start, 1), bucket: null } : null;
  }
  if (period === "month") {
    const month = value || today.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const start = parseDayTR(`${month}-01`)!;
    const [y, m] = month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return { start, end: parseDayTR(next)!, bucket: dayKeyTR };
  }
  const year = value || today.slice(0, 4);
  if (!/^\d{4}$/.test(year)) return null;
  return { start: parseDayTR(`${year}-01-01`)!, end: parseDayTR(`${Number(year) + 1}-01-01`)!, bucket: monthKeyTR };
}

/**
 * Cash book: money in (recorded payments), money out (expenses) and the net, for one day,
 * month or year, with a per-day or per-month series. The day view also counts the day's work.
 */
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });
  if (!canManageCashBook(user.role)) {
    return NextResponse.json({ error: "Kasa raporunu yalnızca işletme sahibi ve yöneticiler görebilir" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const period = (params.get("period") || "day") as Period;
  if (!["day", "month", "year"].includes(period)) {
    return NextResponse.json({ error: "Geçersiz dönem" }, { status: 400 });
  }
  const range = periodRange(period, params.get("date"));
  if (!range) return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  const { start, end, bucket } = range;
  const businessId = user.businessId;

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "PAID",
        order: { businessId },
        OR: [{ paidAt: { gte: start, lt: end } }, { paidAt: null, createdAt: { gte: start, lt: end } }],
      },
      select: {
        amount: true,
        paymentMethod: true,
        paidAt: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, customer: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { businessId, spentAt: { gte: start, lt: end } },
      orderBy: { spentAt: "desc" },
    }),
  ]);

  const income = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byMethod: Record<string, number> = {};
  for (const p of payments) byMethod[p.paymentMethod] = round((byMethod[p.paymentMethod] || 0) + Number(p.amount));
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = round((byCategory[e.category] || 0) + Number(e.amount));

  let series: Array<{ key: string; income: number; expense: number }> | undefined;
  if (bucket) {
    const map = new Map<string, { income: number; expense: number }>();
    // Every day of the month / month of the year, including empty ones
    for (let d = start; d < end; d = addDays(d, 1)) {
      const key = bucket(d);
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
    }
    for (const p of payments) map.get(bucket(p.paidAt ?? p.createdAt))!.income += Number(p.amount);
    for (const e of expenses) map.get(bucket(e.spentAt))!.expense += Number(e.amount);
    series = [...map.entries()].map(([key, v]) => ({ key, income: round(v.income), expense: round(v.expense) }));
  }

  // The day's work, for "Gün Özeti"
  let work: Record<string, number> | undefined;
  if (period === "day") {
    const inDay = { gte: start, lt: end };
    const history = (status: "IN_PROGRESS" | "DELIVERED" | "CANCELLED") =>
      prisma.orderStatusHistory.count({ where: { status, createdAt: inDay, order: { businessId } } });
    const [created, pickedUp, delivered, cancelled] = await Promise.all([
      prisma.order.count({ where: { businessId, createdAt: inDay } }),
      history("IN_PROGRESS"),
      history("DELIVERED"),
      history("CANCELLED"),
    ]);
    work = { created, pickedUp, delivered, cancelled };
  }

  return NextResponse.json({
    period,
    from: dayKeyTR(start),
    to: dayKeyTR(addDays(end, -1)),
    isCurrent: start <= startOfDayTR() && startOfDayTR() < end,
    income: round(income),
    expense: round(expenseTotal),
    net: round(income - expenseTotal),
    byMethod,
    byCategory,
    series,
    work,
    // The day view lists every movement; longer periods only the totals and series
    payments:
      period === "day"
        ? payments.map((p) => ({
            amount: Number(p.amount),
            method: p.paymentMethod,
            at: p.paidAt ?? p.createdAt,
            orderId: p.order.id,
            orderNumber: p.order.orderNumber,
            customer: `${p.order.customer.firstName} ${p.order.customer.lastName}`.trim(),
          }))
        : undefined,
    expenses: period === "day" ? expenses.map((e) => ({ ...e, amount: Number(e.amount) })) : undefined,
  });
}
