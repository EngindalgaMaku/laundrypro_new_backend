import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCashBook } from "@/lib/expenses";
import { deleteAllOrderPhotos } from "@/lib/storage/order-photos";

async function findArchived(request: NextRequest, id: string) {
  const user = getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!user.businessId) return { error: NextResponse.json({ error: "Business not found" }, { status: 400 }) };
  if (!canManageCashBook(user.role)) {
    return { error: NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 }) };
  }
  const row = await prisma.deletedOrder.findFirst({ where: { id, businessId: user.businessId } });
  if (!row) return { error: NextResponse.json({ error: "Silinen sipariş bulunamadı" }, { status: 404 }) };
  return { user, row };
}

/** Restore: the order comes back with the same id, number, tracking link, items, payments and history */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await findArchived(request, id);
  if ("error" in found) return found.error;
  const { user, row } = found;

  const { order, orderItems = [], payments = [], statusHistory = [] } = row.snapshot as any;

  const customer = await prisma.customer.findFirst({ where: { id: order.customerId, businessId: row.businessId } });
  if (!customer) {
    return NextResponse.json({ error: "Siparişin müşterisi silinmiş; sipariş geri alınamaz" }, { status: 409 });
  }
  const clash = await prisma.order.findFirst({
    where: { OR: [{ id: order.id }, { orderNumber: order.orderNumber }] },
    select: { id: true },
  });
  if (clash) return NextResponse.json({ error: "Bu sipariş numarası yeniden kullanılmış" }, { status: 409 });

  // References to users or services removed since the deletion are dropped, not restored
  const userIds = [order.assignedUserId, ...statusHistory.map((h: any) => h.changedBy)].filter(Boolean);
  const liveUsers = new Set(
    (await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } })).map((u) => u.id)
  );
  const serviceIds = orderItems.map((i: any) => i.serviceId).filter(Boolean);
  const liveServices = new Set(
    (await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true } })).map((s) => s.id)
  );
  const livePricing = new Set(
    (
      await prisma.servicePricing.findMany({
        where: { id: { in: orderItems.map((i: any) => i.servicePricingId).filter(Boolean) } },
        select: { id: true },
      })
    ).map((p) => p.id)
  );

  const { businessId: _b, customerId: _c, assignedUserId, ...orderFields } = order;
  await prisma.$transaction([
    prisma.order.create({
      data: {
        ...orderFields,
        business: { connect: { id: row.businessId } },
        customer: { connect: { id: customer.id } },
        ...(assignedUserId && liveUsers.has(assignedUserId) && { assignedUser: { connect: { id: assignedUserId } } }),
        orderItems: {
          create: orderItems.map(({ orderId: _o, serviceId, servicePricingId, ...item }: any) => ({
            ...item,
            ...(serviceId && liveServices.has(serviceId) && { service: { connect: { id: serviceId } } }),
            ...(servicePricingId && livePricing.has(servicePricingId) && { servicePricing: { connect: { id: servicePricingId } } }),
          })),
        },
        payments: { create: payments.map(({ orderId: _o, ...payment }: any) => payment) },
        statusHistory: {
          create: [
            ...statusHistory.map(({ orderId: _o, changedBy, ...h }: any) => ({
              ...h,
              ...(changedBy && liveUsers.has(changedBy) && { user: { connect: { id: changedBy } } }),
            })),
            { status: order.status, notes: "Silinen siparişlerden geri alındı", user: { connect: { id: user.userId } } },
          ],
        },
      },
    }),
    prisma.deletedOrder.delete({ where: { id: row.id } }),
  ]);

  return NextResponse.json({ restored: true, orderId: order.id });
}

/** Delete for good, photos included */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await findArchived(request, id);
  if ("error" in found) return found.error;

  await prisma.deletedOrder.delete({ where: { id: found.row.id } });
  await deleteAllOrderPhotos(found.row.orderId).catch(() => {});
  return NextResponse.json({ purged: true });
}
