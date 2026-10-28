import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: id,
        businessId: currentUser.businessId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        pickupDate: true,
        deliveryDate: true,
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    const enrichedOrders = orders.map((o) => {
      const totalAmount = Number(o.totalAmount || 0);
      const recordedPaid = o.payments
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidAmount =
        o.payments.length === 0 && o.paymentStatus === "PAID"
          ? totalAmount
          : Number(recordedPaid.toFixed(2));
      const remainingAmount =
        o.status === "CANCELLED"
          ? 0
          : Number(Math.max(0, totalAmount - paidAmount).toFixed(2));

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmount,
        paidAmount,
        remainingAmount,
        createdAt: o.createdAt,
        pickupDate: o.pickupDate,
        deliveryDate: o.deliveryDate,
      };
    });

    const totalOrders = enrichedOrders.length;
    const totalSpent = enrichedOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = enrichedOrders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.paidAmount, 0);
    const totalRemainingDebt = enrichedOrders.reduce(
      (sum, o) => sum + o.remainingAmount,
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderDate = totalOrders > 0 ? enrichedOrders[0].createdAt : null;

    return NextResponse.json({
      customer,
      orders: enrichedOrders,
      stats: {
        totalOrders,
        totalSpent,
        totalPaid,
        totalRemainingDebt,
        averageOrderValue,
        lastOrderDate,
      },
    });
  } catch (error) {
    console.error("Get customer orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
