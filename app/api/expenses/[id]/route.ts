import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCashBook } from "@/lib/expenses";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const expense = await prisma.expense.findFirst({ where: { id, businessId: user.businessId } });
  if (!expense) return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
  // Staff may take back their own entry; other entries only the owner or a manager
  if (!canManageCashBook(user.role) && expense.createdById !== user.userId) {
    return NextResponse.json({ error: "Bu gideri silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
