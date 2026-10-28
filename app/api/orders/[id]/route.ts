import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { OrderDatabaseService } from "@/lib/database/orders";
import { UserDatabaseService } from "@/lib/database/users";
import { prisma } from "@/lib/db";
import { newTrackingToken } from "@/lib/order-codes";

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Orders created before tracking tokens existed get one the first time they are opened
    if (!order.trackingToken) {
      order.trackingToken = newTrackingToken();
      await prisma.order.update({
        where: { id: order.id },
        data: { trackingToken: order.trackingToken },
      });
    }

    // Fetch customer GPS coordinates, payment records, and status history
    const [customerCoords, payments, statusHistoryRows] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: order.customer.id },
        select: { latitude: true, longitude: true },
      }),
      prisma.payment.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.orderStatusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const totalAmount = Number(order.totalAmount || 0);
    const recordedPaid = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidAmount =
      payments.length === 0 && order.paymentStatus === "PAID"
        ? totalAmount
        : Number(recordedPaid.toFixed(2));
    const remainingAmount = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));

    const transformedOrder = {
      id: order.id,
      businessId: order.businessId,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
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
        latitude: customerCoords?.latitude ?? undefined,
        longitude: customerCoords?.longitude ?? undefined,
      },
      service: order.orderItems?.[0]?.service?.name,
      serviceType: order.orderItems?.[0]?.service?.category || "OTHER",
      status: order.status,
      amount: `₺${totalAmount.toLocaleString("tr-TR")}`,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentMethod: order.paymentMethod || "CASH",
      paymentStatus: order.paymentStatus || "PENDING",
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        status: p.status,
        notes: p.notes,
        paidAt: p.paidAt?.toISOString() || p.createdAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
      date: order.createdAt.toISOString().split("T")[0],
      phone: order.customer.phone || "",
      whatsapp: order.customer.whatsapp || order.customer.phone || "",
      email: order.customer.email || "",
      description: order.notes || `${order.orderItems?.length || 0} hizmet`,

      orderInfo: order.orderInfo || null,
      deliveryNotes: order.deliveryNotes || null,
      referenceCode: order.referenceCode || null,
      notes: order.notes || null,
      specialInstructions: order.specialInstructions || null,

      priority: order.priority || "NORMAL",
      isUrgent: order.priority === "URGENT" || false,
      whatsappNotifications: true,
      address: order.customer.address || "",
      district: order.customer.district || "",
      city: order.customer.city || "",
      customerId: order.customer.id,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pickupDate: order.pickupDate?.toISOString() || null,
      deliveryDate: order.deliveryDate?.toISOString() || null,
      syncStatus: "synced" as const,

      items: (order.orderItems || []).map((item: any) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service?.name || item.serviceName,
        serviceDescription:
          item.service?.description || item.serviceDescription || "",
        serviceCategory: item.service?.category || "OTHER",
        isManualEntry: item.isManualEntry || false,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        notes: item.notes || "",
        service: item.service
          ? {
              id: item.service.id,
              name: item.service.name,
              category: item.service.category,
              description: item.service.description,
            }
          : null,
      })),

      photos: [],
      statusHistory: statusHistoryRows.map((sh) => ({
        status: sh.status,
        timestamp: sh.createdAt.toISOString(),
        note: sh.notes || undefined,
        updatedBy: sh.user
          ? `${sh.user.firstName || ""} ${sh.user.lastName || ""}`.trim() || "Kullanıcı"
          : "Sistem",
      })),
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error(`[ORDER-GET] Critical error fetching order ${params.id}:`, {
      error: error instanceof Error ? error.message : "Unknown error",
      orderId: params.id,
    });

    if (error instanceof Error && error.message === "Order not found") {
      return NextResponse.json(
        {
          error: "Order not found",
          code: "ORDER_NOT_FOUND",
          orderId: params.id,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to load order details",
        code: "ORDER_FETCH_ERROR",
        orderId: params.id,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await UserDatabaseService.getUserById(user.userId);

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const transformedUpdateData = { ...body };

    const updatedOrder = await OrderDatabaseService.updateOrder(
      params.id,
      currentUser.businessId,
      transformedUpdateData
    );

    const transformedOrder = {
      id: updatedOrder.id,
      businessId: updatedOrder.businessId,
      orderNumber: updatedOrder.orderNumber,
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
      service: updatedOrder.orderItems?.[0]?.service?.name,
      serviceType: updatedOrder.orderItems?.[0]?.service?.category || "OTHER",
      status: updatedOrder.status,
      amount: `₺${Number(updatedOrder.totalAmount).toLocaleString("tr-TR")}`,
      totalAmount: Number(updatedOrder.totalAmount),
      paymentMethod: updatedOrder.paymentMethod || "CASH",
      paymentStatus: updatedOrder.paymentStatus || "PENDING",
      date: updatedOrder.createdAt.toISOString().split("T")[0],
      phone: updatedOrder.customer.phone,
      whatsapp: updatedOrder.customer.whatsapp || updatedOrder.customer.phone,
      email: (updatedOrder.customer as any).email,
      description:
        updatedOrder.notes || `${updatedOrder.orderItems?.length || 0} hizmet`,
      orderInfo: updatedOrder.orderInfo,
      deliveryNotes: updatedOrder.deliveryNotes,
      referenceCode: updatedOrder.referenceCode,
      notes: updatedOrder.notes,
      specialInstructions: updatedOrder.specialInstructions,
      priority: updatedOrder.priority,
      isUrgent: updatedOrder.priority === "URGENT" || false,
      whatsappNotifications: true,
      address: (updatedOrder.customer as any).address,
      district: (updatedOrder.customer as any).district || "",
      city: (updatedOrder.customer as any).city || "",
      customerId: updatedOrder.customer.id,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString(),
      pickupDate: updatedOrder.pickupDate?.toISOString(),
      deliveryDate: updatedOrder.deliveryDate?.toISOString(),
      syncStatus: "synced" as const,
      items: (updatedOrder.orderItems || []).map((item: any) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service?.name || item.serviceName,
        serviceDescription:
          item.service?.description || item.serviceDescription || "",
        serviceCategory: item.service?.category || "OTHER",
        isManualEntry: item.isManualEntry || false,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        notes: item.notes || "",
        service: item.service
          ? {
              id: item.service.id,
              name: item.service.name,
              category: item.service.category,
              description: item.service.description,
            }
          : null,
      })),
      photos: [],
      statusHistory: [],
    };

    return NextResponse.json({
      message: "Order updated successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error(`[ORDER-UPDATE] Critical error updating order ${params.id}:`, error);

    if (error instanceof Error && error.message === "Order not found") {
      return NextResponse.json(
        {
          error: "Order not found",
          code: "ORDER_NOT_FOUND",
          orderId: params.id,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update order details",
        code: "ORDER_UPDATE_ERROR",
        orderId: params.id,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
