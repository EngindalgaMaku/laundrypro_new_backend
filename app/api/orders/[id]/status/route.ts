import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { OrderDatabaseService } from "@/lib/database/orders";
import { UserDatabaseService } from "@/lib/database/users";
import { OrderStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await UserDatabaseService.getUserById(user.userId);

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notes, photos, timestamp } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status is a valid OrderStatus
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "READY_FOR_PICKUP",
      "READY_FOR_DELIVERY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch current order to validate transition
    const currentOrder = await OrderDatabaseService.getOrderById(
      params.id,
      currentUser.businessId
    );

    const currentStatus = currentOrder.status as OrderStatus;

    // Enforce workflow transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["READY_FOR_PICKUP", "CANCELLED"],
      READY_FOR_PICKUP: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["READY_FOR_DELIVERY", "CANCELLED"],
      READY_FOR_DELIVERY: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["COMPLETED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    const nextStatus = status as OrderStatus;
    if (!validTransitions[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: "Invalid status transition",
          details: {
            from: currentStatus,
            to: nextStatus,
            allowed: validTransitions[currentStatus] || [],
          },
        },
        { status: 400 }
      );
    }

    // Update order status
    const updatedOrder = await OrderDatabaseService.updateOrder(
      params.id,
      currentUser.businessId,
      {
        status: status as OrderStatus,
        notes: notes || undefined,
      }
    );

    // Transform order for frontend
    const transformedOrder = {
      id: updatedOrder.id, // Use actual database ID
      orderNumber: updatedOrder.orderNumber,
      customer: `${updatedOrder.customer.firstName} ${updatedOrder.customer.lastName}`,
      service:
        updatedOrder.orderItems?.[0]?.service?.name || "Çeşitli Hizmetler",
      serviceType: updatedOrder.orderItems?.[0]?.service?.category || "OTHER",
      status: updatedOrder.status,
      amount: `₺${Number(updatedOrder.totalAmount).toLocaleString("tr-TR")}`,
      totalAmount: Number(updatedOrder.totalAmount),
      date: updatedOrder.createdAt.toISOString().split("T")[0],
      phone: updatedOrder.customer.phone,
      whatsapp: updatedOrder.customer.whatsapp || updatedOrder.customer.phone,
      email: (updatedOrder.customer as any).email,
      description:
        updatedOrder.notes || `${updatedOrder.orderItems?.length || 0} hizmet`,
      priority: updatedOrder.priority,
      address: (updatedOrder.customer as any).address,
      customerId: updatedOrder.customer.id,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString(),
      pickupDate: updatedOrder.pickupDate?.toISOString(),
      deliveryDate: updatedOrder.deliveryDate?.toISOString(),
      items: updatedOrder.orderItems || [],
      photos: [], // Add photos support later
    };

    return NextResponse.json({
      message: "Order status updated successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    if (error instanceof Error && error.message === "Order not found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
