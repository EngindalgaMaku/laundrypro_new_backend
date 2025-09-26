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

    // Log order data for debugging
    console.log(`[ORDER-GET] Processing order ${order.id}:`, {
      hasOrderInfo: !!order.orderInfo,
      hasDeliveryNotes: !!order.deliveryNotes,
      hasReferenceCode: !!order.referenceCode,
      hasNotes: !!order.notes,
      hasSpecialInstructions: !!order.specialInstructions,
      orderItemsCount: order.orderItems?.length || 0,
    });

    // Transform order for frontend with comprehensive field mapping
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
      amount: `₺${Number(order.totalAmount || 0).toLocaleString("tr-TR")}`,
      totalAmount: Number(order.totalAmount || 0),
      // Add missing payment fields for frontend compatibility
      paymentMethod: order.paymentMethod || "CASH",
      paymentStatus: order.paymentStatus || "PENDING",
      date: order.createdAt.toISOString().split("T")[0],
      phone: order.customer.phone || "",
      whatsapp: order.customer.whatsapp || order.customer.phone || "",
      email: order.customer.email || "",
      description: order.notes || `${order.orderItems?.length || 0} hizmet`,

      // CRITICAL FIELDS: Always include these fields, even if null/empty
      // This prevents frontend conditional rendering from hiding entire sections
      orderInfo: order.orderInfo || null, // Sipariş Bilgisi - Primary order details
      deliveryNotes: order.deliveryNotes || null, // Teslimat Notu - Delivery instructions
      referenceCode: order.referenceCode || null, // Referans Kodu - Reference identifier
      notes: order.notes || null, // Genel notlar - General notes
      specialInstructions: order.specialInstructions || null, // Özel talimatlar - Special instructions

      priority: order.priority || "NORMAL",
      // Add missing fields for frontend
      isUrgent: order.priority === "URGENT" || false,
      whatsappNotifications: true, // Default value since not in database yet
      address: order.customer.address || "",
      district: order.customer.district || "",
      city: order.customer.city || "",
      customerId: order.customer.id,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pickupDate: order.pickupDate?.toISOString() || null,
      deliveryDate: order.deliveryDate?.toISOString() || null,
      // Add syncStatus for frontend compatibility
      syncStatus: "synced" as const,

      // CRITICAL FIX: Enhanced items transformation with fallback logic
      // This prevents empty items arrays that cause mobile app Turkish error messages
      items: (() => {
        const existingItems = order.orderItems || [];

        // Log the current state for debugging
        console.log(
          `[ORDER-GET] Processing ${existingItems.length} existing items for order ${order.id}`
        );

        // If we have existing order items, process them normally
        if (existingItems.length > 0) {
          return existingItems.map((item: any) => {
            console.log(`[ORDER-GET] Processing existing item ${item.id}:`, {
              hasServiceId: !!item.serviceId,
              hasServiceName: !!item.serviceName,
              isManualEntry: item.isManualEntry,
              hasService: !!item.service,
            });

            return {
              id: item.id,
              serviceId: item.serviceId || `manual-${item.id}`,
              serviceName:
                item.serviceName || item.service?.name || "Manual Service",
              serviceDescription:
                item.serviceDescription || item.service?.description || "",
              serviceCategory: item.service?.category || "OTHER",
              isManualEntry: item.isManualEntry || !item.serviceId,
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
            };
          });
        }

        // FALLBACK: If no orderItems exist, create a fallback item from order data
        // This prevents the mobile app from showing "Service details could not be loaded" errors
        console.warn(
          `[ORDER-GET] No orderItems found for order ${order.id}, creating fallback item`
        );

        const fallbackItem = {
          id: `fallback-${order.id}`,
          serviceId: `fallback-${order.id}`,
          serviceName: order.orderInfo || "Temizlik Hizmeti",
          serviceDescription:
            order.notes || order.deliveryNotes || "Manuel hizmet girişi",
          serviceCategory: "OTHER",
          isManualEntry: true,
          quantity: 1,
          unitPrice: Number(order.totalAmount || 0),
          totalPrice: Number(order.totalAmount || 0),
          notes:
            [
              order.orderInfo,
              order.notes,
              order.deliveryNotes,
              order.specialInstructions,
              order.referenceCode ? `Referans: ${order.referenceCode}` : null,
            ]
              .filter(Boolean)
              .join(" - ") || "Manuel hizmet",
          service: null, // No service reference for fallback items
        };

        console.log(
          `[ORDER-GET] Created fallback item for order ${order.id}:`,
          {
            serviceName: fallbackItem.serviceName,
            totalPrice: fallbackItem.totalPrice,
            notes: fallbackItem.notes,
          }
        );

        return [fallbackItem];
      })(),

      photos: [], // Add photos support later
      // Initialize statusHistory as empty array for frontend compatibility
      statusHistory: [],
    };

    // CRITICAL VALIDATION: Ensure items array is never empty
    if (!transformedOrder.items || transformedOrder.items.length === 0) {
      console.error(
        `[ORDER-GET] CRITICAL: Items array is empty after transformation for order ${order.id}!`
      );
      // This should never happen with our fallback logic, but add extra protection
      transformedOrder.items = [
        {
          id: `emergency-fallback-${order.id}`,
          serviceId: `emergency-fallback-${order.id}`,
          serviceName: "Hizmet Bilgisi Yükleniyor",
          serviceDescription: "Manuel hizmet girişi",
          serviceCategory: "OTHER",
          isManualEntry: true,
          quantity: 1,
          unitPrice: Number(order.totalAmount || 0),
          totalPrice: Number(order.totalAmount || 0),
          notes: "Acil durum yedek kaydı",
          service: null,
        },
      ];
    }

    console.log(
      `[ORDER-GET] Successfully transformed order ${order.id} with ${transformedOrder.items.length} items:`,
      {
        hasOrderItems: !!(order.orderItems && order.orderItems.length > 0),
        itemsCount: transformedOrder.items.length,
        firstItemName: transformedOrder.items[0]?.serviceName,
        isFallbackUsed: transformedOrder.items[0]?.id?.includes("fallback"),
        isEmergencyFallback:
          transformedOrder.items[0]?.id?.includes("emergency-fallback"),
      }
    );

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error(`[ORDER-GET] Critical error fetching order ${params.id}:`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      orderId: params.id,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent"),
      businessContext:
        "Potential items array failure causing mobile app errors",
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

    // Enhanced error response with debugging information
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to load order details",
        code: "ORDER_FETCH_ERROR",
        orderId: params.id,
        timestamp: new Date().toISOString(),
        // Only include debug info in development
        ...(process.env.NODE_ENV === "development" && {
          debugInfo: {
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            context:
              "This error may cause mobile app to show Turkish error messages",
          },
        }),
      },
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
      // CRITICAL FIX: Enhanced items transformation with fallback logic for updates
      items: (() => {
        const existingItems = updatedOrder.orderItems || [];

        // Log the current state for debugging
        console.log(
          `[ORDER-UPDATE] Processing ${existingItems.length} existing items for updated order ${updatedOrder.id}`
        );

        // If we have existing order items, process them normally
        if (existingItems.length > 0) {
          return existingItems.map((item: any) => ({
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
          }));
        }

        // FALLBACK: If no orderItems exist, create a fallback item from order data
        console.warn(
          `[ORDER-UPDATE] No orderItems found for updated order ${updatedOrder.id}, creating fallback item`
        );

        const fallbackItem = {
          id: `fallback-${updatedOrder.id}`,
          serviceId: `fallback-${updatedOrder.id}`,
          serviceName: updatedOrder.orderInfo || "Temizlik Hizmeti",
          serviceDescription:
            updatedOrder.notes ||
            updatedOrder.deliveryNotes ||
            "Manuel hizmet girişi",
          serviceCategory: "OTHER",
          isManualEntry: true,
          quantity: 1,
          unitPrice: Number(updatedOrder.totalAmount || 0),
          totalPrice: Number(updatedOrder.totalAmount || 0),
          notes:
            [
              updatedOrder.orderInfo,
              updatedOrder.notes,
              updatedOrder.deliveryNotes,
              updatedOrder.specialInstructions,
              updatedOrder.referenceCode
                ? `Referans: ${updatedOrder.referenceCode}`
                : null,
            ]
              .filter(Boolean)
              .join(" - ") || "Manuel hizmet",
          service: null,
        };

        console.log(
          `[ORDER-UPDATE] Created fallback item for updated order ${updatedOrder.id}:`,
          {
            serviceName: fallbackItem.serviceName,
            totalPrice: fallbackItem.totalPrice,
            notes: fallbackItem.notes,
          }
        );

        return [fallbackItem];
      })(),
      photos: [], // Add photos support later
      // Initialize statusHistory as empty array for frontend compatibility
      statusHistory: [],
    };

    // CRITICAL VALIDATION: Ensure items array is never empty for updates
    if (!transformedOrder.items || transformedOrder.items.length === 0) {
      console.error(
        `[ORDER-UPDATE] CRITICAL: Items array is empty after transformation for updated order ${updatedOrder.id}!`
      );
      // This should never happen with our fallback logic, but add extra protection
      transformedOrder.items = [
        {
          id: `emergency-fallback-${updatedOrder.id}`,
          serviceId: `emergency-fallback-${updatedOrder.id}`,
          serviceName: "Hizmet Bilgisi Yükleniyor",
          serviceDescription: "Manuel hizmet girişi",
          serviceCategory: "OTHER",
          isManualEntry: true,
          quantity: 1,
          unitPrice: Number(updatedOrder.totalAmount || 0),
          totalPrice: Number(updatedOrder.totalAmount || 0),
          notes: "Acil durum yedek kaydı",
          service: null,
        },
      ];
    }

    console.log(
      `[ORDER-UPDATE] Successfully transformed updated order ${updatedOrder.id} with ${transformedOrder.items.length} items:`,
      {
        hasOrderItems: !!(
          updatedOrder.orderItems && updatedOrder.orderItems.length > 0
        ),
        itemsCount: transformedOrder.items.length,
        firstItemName: transformedOrder.items[0]?.serviceName,
        isFallbackUsed: transformedOrder.items[0]?.id?.includes("fallback"),
        isEmergencyFallback:
          transformedOrder.items[0]?.id?.includes("emergency-fallback"),
      }
    );

    return NextResponse.json({
      message: "Order updated successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error(
      `[ORDER-UPDATE] Critical error updating order ${params.id}:`,
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        orderId: params.id,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get("user-agent"),
        businessContext:
          "Potential items array failure causing mobile app errors",
      }
    );

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

    // Enhanced error response with debugging information
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update order details",
        code: "ORDER_UPDATE_ERROR",
        orderId: params.id,
        timestamp: new Date().toISOString(),
        // Only include debug info in development
        ...(process.env.NODE_ENV === "development" && {
          debugInfo: {
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            context:
              "This error may cause mobile app to show Turkish error messages",
          },
        }),
      },
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
