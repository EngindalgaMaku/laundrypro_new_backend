import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isExpenseCategory } from "@/lib/expenses";
import { addDays, parseDayTR, startOfDayTR } from "@/lib/turkey-time";

/** Expenses between ?from and ?to (YYYY-MM-DD, Turkish days, inclusive); default the last 30 days */
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ? parseDayTR(params.get("from")!) : addDays(startOfDayTR(), -29);
  const toDay = params.get("to") ? parseDayTR(params.get("to")!) : startOfDayTR();
  if (!from || !toDay) return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });

  const expenses = await prisma.expense.findMany({
    where: { businessId: user.businessId, spentAt: { gte: from, lt: addDays(toDay, 1) } },
    orderBy: { spentAt: "desc" },
    take: 1000,
  });
  return NextResponse.json({
    expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    total: Number(expenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)),
  });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return NextResponse.json({ error: "Tutar sıfırdan büyük olmalı" }, { status: 400 });
  }
  if (!isExpenseCategory(body.category)) {
    return NextResponse.json({ error: "Geçersiz gider türü" }, { status: 400 });
  }
  const method = body.paymentMethod;
  if (method != null && !(Object.values(PaymentMethod) as string[]).includes(method)) {
    return NextResponse.json({ error: "Geçersiz ödeme şekli" }, { status: 400 });
  }
  // A chosen day is stored at noon Turkish time so it never slides into the next or previous day
  let spentAt = new Date();
  if (typeof body.date === "string" && body.date) {
    const day = parseDayTR(body.date);
    if (!day) return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    spentAt = day.getTime() === startOfDayTR().getTime() ? new Date() : new Date(day.getTime() + 12 * 3600 * 1000);
  }

  const expense = await prisma.expense.create({
    data: {
      businessId: user.businessId,
      amount: Number(amount.toFixed(2)),
      category: body.category,
      description: typeof body.description === "string" ? body.description.trim().slice(0, 500) || null : null,
      paymentMethod: method ?? null,
      spentAt,
      createdById: user.userId,
    },
  });
  return NextResponse.json({ expense: { ...expense, amount: Number(expense.amount) } }, { status: 201 });
}
