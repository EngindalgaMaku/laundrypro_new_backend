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
      businessId: order.businessId, // Add missing businessId
      orderNumber: order.orderNumber,
      // Customer as object for proper frontend handling
      customer: {
        id: order.customer.id,
        name:
          `${order.customer.firstName || ""} ${
            order.customer.lastName || ""
          }`.trim() || "İsimsiz",
        firstName: order.customer.firstName || "",
        lastName: order.customer.lastName || "",
        phone: order.customer.phone || "",
        whatsapp: order.customer.whatsapp || order.customer.phone || "",
        email: order.customer.email || "",
        address: order.customer.address || "",
        district: order.customer.district || "",
        city: order.customer.city || "",
      },
      service: order.orderItems?.[0]?.service?.name || "Çeşitli Hizmetler",
      serviceType: order.orderItems?.[0]?.service?.category || "OTHER",
      status: order.status,
      amount: `₺${Number(order.totalAmount).toLocaleString("tr-TR")}`,
      totalAmount: Number(order.totalAmount),
      // Add missing payment fields for frontend compatibility
      paymentMethod: order.paymentMethod || "CASH",
      paymentStatus: order.paymentStatus || "PENDING",
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
      // Add missing fields for frontend
      isUrgent: order.priority === "URGENT" || false,
      whatsappNotifications: true, // Default value since not in database yet
      address: order.customer.address,
      district: order.customer.district || "",
      city: order.customer.city || "",
      customerId: order.customer.id,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pickupDate: order.pickupDate?.toISOString(),
      deliveryDate: order.deliveryDate?.toISOString(),
      // Add syncStatus for frontend compatibility
      syncStatus: "synced" as const,
      // Enhanced items transformation for proper frontend handling
      items:
        order.orderItems?.map((item: any) => ({
          id: item.id,
          serviceId: item.serviceId || `manual-${item.id}`,
          serviceName:
            item.serviceName || item.service?.name || "Manual Service",
          serviceDescription:
            item.serviceDescription || item.service?.description || "",
          serviceCategory: item.service?.category || "OTHER",
          isManualEntry: item.isManualEntry || false,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice:
            Number(item.totalPrice) ||
            (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
          notes: item.notes || "",
          // Include service reference for non-manual entries
          service: item.service
            ? {
                id: item.service.id,
                name: item.service.name,
                category: item.service.category,
                description: item.service.description,
              }
            : null,
        })) || [],
      photos: [], // Add photos support later
      // Initialize statusHistory as empty array for frontend compatibility
      statusHistory: [],
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

    // Transform frontend data structure to backend format for updates
    let transformedUpdateData = { ...body };

    // If frontend sends items, we need to handle them (though order items updating is complex)
    if (body.items && Array.isArray(body.items)) {
      console.log(
        "⚠️ Order update with items detected - this requires special handling"
      );

      // For now, preserve the items in the update data but don't crash
      // Full item updates would require deleting/recreating order items
      // which is a complex operation that should be handled carefully
    }

    // Log the update operation for debugging
    console.log("🔄 Order update data:", {
      orderId: params.id,
      hasItems: !!body.items,
      itemCount: body.items?.length || 0,
      updateFields: Object.keys(transformedUpdateData),
    });

    const updatedOrder = await OrderDatabaseService.updateOrder(
      params.id,
      currentUser.businessId,
      transformedUpdateData
    );

    // Transform order for frontend
    const transformedOrder = {
      id: updatedOrder.id, // Use actual database ID
      businessId: updatedOrder.businessId, // Add missing businessId
      orderNumber: updatedOrder.orderNumber,
      // Customer as object for proper frontend handling
      customer: {
        id: updatedOrder.customer.id,
        name:
          `${updatedOrder.customer.firstName || ""} ${
            updatedOrder.customer.lastName || ""
          }`.trim() || "İsimsiz",
        firstName: updatedOrder.customer.firstName || "",
        lastName: updatedOrder.customer.lastName || "",
        phone: updatedOrder.customer.phone || "",
        whatsapp:
          updatedOrder.customer.whatsapp || updatedOrder.customer.phone || "",
        email: (updatedOrder.customer as any).email || "",
        address: (updatedOrder.customer as any).address || "",
        district: (updatedOrder.customer as any).district || "",
        city: (updatedOrder.customer as any).city || "",
      },
      service:
        updatedOrder.orderItems?.[0]?.service?.name || "Çeşitli Hizmetler",
      serviceType: updatedOrder.orderItems?.[0]?.service?.category || "OTHER",
      status: updatedOrder.status,
      amount: `₺${Number(updatedOrder.totalAmount).toLocaleString("tr-TR")}`,
      totalAmount: Number(updatedOrder.totalAmount),
      // Add missing payment fields for frontend compatibility
      paymentMethod: updatedOrder.paymentMethod || "CASH",
      paymentStatus: updatedOrder.paymentStatus || "PENDING",
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
      // Add missing fields for frontend
      isUrgent: updatedOrder.priority === "URGENT" || false,
      whatsappNotifications: true, // Default value since not in database yet
      address: (updatedOrder.customer as any).address,
      district: (updatedOrder.customer as any).district || "",
      city: (updatedOrder.customer as any).city || "",
      customerId: updatedOrder.customer.id,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString(),
      pickupDate: updatedOrder.pickupDate?.toISOString(),
      deliveryDate: updatedOrder.deliveryDate?.toISOString(),
      // Add syncStatus for frontend compatibility
      syncStatus: "synced" as const,
      // Enhanced items transformation for proper frontend handling
      items:
        updatedOrder.orderItems?.map((item: any) => ({
          id: item.id,
          serviceId: item.serviceId || `manual-${item.id}`,
          serviceName:
            item.serviceName || item.service?.name || "Manual Service",
          serviceDescription:
            item.serviceDescription || item.service?.description || "",
          serviceCategory: item.service?.category || "OTHER",
          isManualEntry: item.isManualEntry || false,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice:
            Number(item.totalPrice) ||
            (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
          notes: item.notes || "",
          // Include service reference for non-manual entries
          service: item.service
            ? {
                id: item.service.id,
                name: item.service.name,
                category: item.service.category,
                description: item.service.description,
              }
            : null,
        })) || [],
      photos: [], // Add photos support later
      // Initialize statusHistory as empty array for frontend compatibility
      statusHistory: [],
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
        {
          error: err.message,
          code: err.code,
          currentStatus: err.currentStatus,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
