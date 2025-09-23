import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { OrderDatabaseService } from "@/lib/database/orders";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(
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

    const order = await OrderDatabaseService.getOrderById(
      params.id,
      currentUser.businessId
    );

    // Transform order for frontend
    const transformedOrder = {
      id: order.id, // Use actual database ID
      orderNumber: order.orderNumber,
      customer: `${order.customer.firstName} ${order.customer.lastName}`,
      service: order.orderItems?.[0]?.service?.name || "Çeşitli Hizmetler",
      serviceType: order.orderItems?.[0]?.service?.category || "OTHER",
      status: order.status,
      amount: `₺${Number(order.totalAmount).toLocaleString("tr-TR")}`,
      totalAmount: Number(order.totalAmount),
      date: order.createdAt.toISOString().split("T")[0],
      phone: order.customer.phone,
      whatsapp: order.customer.whatsapp || order.customer.phone,
      email: order.customer.email,
      description: order.notes || `${order.orderItems?.length || 0} hizmet`,
      orderInfo: order.orderInfo, // Sipariş Bilgisi
      deliveryNotes: order.deliveryNotes, // Teslimat Notu
      referenceCode: order.referenceCode, // Referans Kodu
      notes: order.notes, // Genel notlar
      specialInstructions: order.specialInstructions, // Özel talimatlar
      priority: order.priority,
      address: order.customer.address,
      district: order.customer.district || "",
      city: order.customer.city || "",
      customerId: order.customer.id,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pickupDate: order.pickupDate?.toISOString(),
      deliveryDate: order.deliveryDate?.toISOString(),
      items: order.orderItems || [],
      photos: [], // Add photos support later
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error("Get order error:", error);
    if (error instanceof Error && error.message === "Order not found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const updatedOrder = await OrderDatabaseService.updateOrder(
      params.id,
      currentUser.businessId,
      body
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
      orderInfo: updatedOrder.orderInfo, // Sipariş Bilgisi
      deliveryNotes: updatedOrder.deliveryNotes, // Teslimat Notu
      referenceCode: updatedOrder.referenceCode, // Referans Kodu
      notes: updatedOrder.notes, // Genel notlar
      specialInstructions: updatedOrder.specialInstructions, // Özel talimatlar
      priority: updatedOrder.priority,
      address: (updatedOrder.customer as any).address,
      district: (updatedOrder.customer as any).district || "",
      city: (updatedOrder.customer as any).city || "",
      customerId: updatedOrder.customer.id,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString(),
      pickupDate: updatedOrder.pickupDate?.toISOString(),
      deliveryDate: updatedOrder.deliveryDate?.toISOString(),
      items: updatedOrder.orderItems || [],
      photos: [], // Add photos support later
    };

    return NextResponse.json({
      message: "Order updated successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);
    if (error instanceof Error && error.message === "Order not found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await OrderDatabaseService.deleteOrder(params.id, currentUser.businessId);

    return NextResponse.json({
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Delete order error:", error);
    const err: any = error;
    if (err instanceof Error && err.message === "Order not found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    // Map known business errors to 400
    if (err?.code === "ORDER_ASSIGNED_TO_ROUTE") {
      return NextResponse.json(
        {
          error: "Order assigned to active route",
          code: err.code,
          routeId: err.routeId,
          routeStatus: err.routeStatus,
        },
        { status: 400 }
      );
    }
    if (err?.code === "ORDER_NOT_DELETABLE") {
      return NextResponse.json(
        { error: err.message, code: err.code, currentStatus: err.currentStatus },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
