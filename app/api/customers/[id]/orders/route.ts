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
    
    // Get current user's business ID
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { businessId: true }
    });

    if (!currentUser?.businessId) {
      return NextResponse.json({ error: "User has no business associated" }, { status: 400 });
    }

    // Fetch customer
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get orders for this customer
    const orders = await prisma.order.findMany({
      where: { 
        customerId: id,
        businessId: currentUser.businessId 
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        pickupDate: true,
        deliveryDate: true,
      }
    });

    // Compute stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderDate = totalOrders > 0 ? orders[0].createdAt : null;

    return NextResponse.json({
      customer,
      orders,
      stats: {
        totalOrders,
        totalSpent,
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
