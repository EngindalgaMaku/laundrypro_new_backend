import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { OrderDatabaseService } from "@/lib/database/orders";
import { getPlanForBusiness } from "@/lib/entitlements";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    // Handle mobile app parameters
    const customerName = url.searchParams.get("customerName");
    const orderNumber = url.searchParams.get("orderNumber");
    const paymentStatus = url.searchParams.get("paymentStatus");
    const paymentMethod = url.searchParams.get("paymentMethod");
    const priority = url.searchParams.get("priority");
    const isUrgent = url.searchParams.get("isUrgent");
    const assignedDriver = url.searchParams.get("assignedDriver");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const sortBy = url.searchParams.get("sortBy") as
      | "createdAt"
      | "pickupDate"
      | "deliveryDate"
      | "totalAmount"
      | undefined;
    const sortOrder = url.searchParams.get("sortOrder") as
      | "asc"
      | "desc"
      | undefined;
    const offset =
      parseInt(url.searchParams.get("offset") || "0") || (page - 1) * limit;

    console.log(`[ORDERS-GET] Search params:`, {
      page,
      limit,
      status,
      search,
      customerName,
      orderNumber,
      paymentStatus,
      paymentMethod,
      priority,
      isUrgent,
      assignedDriver,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      offset,
    });

    const filters: any = {
      businessId: currentUser.businessId,
    };

    if (status && status !== "ALL") {
      filters.status = [status as any];
    }

    // Use search parameter or customerName parameter from mobile
    const searchQuery = search || customerName;
    if (searchQuery) {
      filters.search = searchQuery;
    }

    if (priority) {
      filters.priority = priority as any;
    }

    if (startDate && endDate) {
      filters.dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    if (sortBy) {
      filters.sortBy = sortBy;
      filters.sortOrder = sortOrder || "desc";
    }

    console.log(`[ORDERS-GET] Final filters:`, filters);

    const { orders, total } = await OrderDatabaseService.getOrders(
      filters,
      limit,
      offset
    );

    // Transform orders for frontend with comprehensive field mapping
    const transformedOrders = orders.map((order) => {
      // Log order data for debugging missing fields
      console.log(`[ORDERS-GET] Processing order ${order.id}:`, {
        hasOrderInfo: !!order.orderInfo,
        hasDeliveryNotes: !!order.deliveryNotes,
        hasReferenceCode: !!order.referenceCode,
        hasNotes: !!order.notes,
        hasSpecialInstructions: !!order.specialInstructions,
        orderItemsCount: order.orderItems?.length || 0,
      });

      return {
        id: order.id, // Use actual database ID, not orderNumber
        orderNumber: order.orderNumber,
        customer:
          `${order.customer.firstName || ""} ${
            order.customer.lastName || ""
          }`.trim() || "İsimsiz",
        service: order.orderItems?.[0]?.service?.name || "Çeşitli Hizmetler",
        serviceType: order.orderItems?.[0]?.service?.category || "OTHER",
        status: order.status,
        amount: `₺${Number(order.totalAmount || 0).toLocaleString("tr-TR")}`,
        totalAmount: Number(order.totalAmount || 0),
        date: order.createdAt.toISOString().split("T")[0],
        phone: order.customer.phone || "",
        whatsapp: order.customer.whatsapp || order.customer.phone || "",
        email: order.customer.email || "",
        description: order.notes || `${order.orderItems?.length || 0} hizmet`,
        priority: order.priority || "NORMAL",
        address: order.customer.address || "",
        district: order.customer.district || "",
        city: order.customer.city || "",
        customerId: order.customer.id,
        createdAt: order.createdAt.toISOString(),
        pickupDate: order.pickupDate?.toISOString() || null,
        deliveryDate: order.deliveryDate?.toISOString() || null,
        // CRITICAL FIELDS: Always include these fields, even if null/empty
        // This prevents frontend conditional rendering from hiding entire sections
        orderInfo: order.orderInfo || null, // Sipariş Bilgisi - Primary order details
        deliveryNotes: order.deliveryNotes || null, // Teslimat Notu - Delivery instructions
        referenceCode: order.referenceCode || null, // Referans Kodu - Reference identifier
        notes: order.notes || null, // Genel notlar - General notes
        specialInstructions: order.specialInstructions || null, // Özel talimatlar - Special instructions
        // Enhanced order items with proper transformation
        items: (order.orderItems || []).map((item: any) => ({
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
        })),
      };
    });

    // Log successful response
    console.log(
      `[ORDERS-GET] Successfully transformed ${transformedOrders.length} orders`
    );

    return NextResponse.json({
      orders: transformedOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      meta: {
        hasFilters: !!(status || search || customerName),
        appliedFilters: {
          status: status || "ALL",
          search: search || customerName,
        },
      },
    });
  } catch (error) {
    console.error("[ORDERS-GET] Critical error in orders API:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to load orders",
        code: "ORDERS_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Plan/limit checks
    const FREE_DAILY_LIMIT = parseInt(
      process.env.FREE_DAILY_ORDER_LIMIT || "50",
      10
    );

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const plan = await getPlanForBusiness(currentUser.businessId);
    if (plan !== "PRO") {
      // Count today's orders for FREE plan
      const todayCount = await OrderDatabaseService.getOrders(
        {
          businessId: currentUser.businessId,
          dateRange: { startDate: startOfDay, endDate: endOfDay },
        } as any,
        1,
        0
      ).then((res) => res.total);

      if (todayCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: "Günlük sipariş limitine ulaştınız",
            message: `FREE planda günlük ${FREE_DAILY_LIMIT} sipariş limiti bulunmaktadır. Daha fazla sipariş oluşturmak için PRO plana yükseltebilirsiniz.`,
            limit: FREE_DAILY_LIMIT,
          },
          { status: 402 }
        );
      }
    }

    // Transform frontend data structure to backend format
    let transformedData = {
      ...body,
      businessId: currentUser.businessId,
    };

    // Map frontend 'items' to backend 'services' format
    if (body.items && Array.isArray(body.items)) {
      transformedData.services = body.items.map((item: any) => ({
        // Handle both manual and database services
        serviceId: item.serviceId || item.id,
        serviceName: item.serviceName || item.name,
        serviceDescription: item.serviceDescription || item.description,
        isManualEntry: item.isManualEntry || false,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        notes: item.notes || "",
        // Additional frontend fields
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
      }));

      // Remove items field since we've mapped to services
      delete transformedData.items;

      console.log("🔄 Mapped frontend items to backend services:", {
        originalItems: body.items.length,
        mappedServices: transformedData.services.length,
        sampleService: transformedData.services[0],
      });
    }

    const order = await OrderDatabaseService.createOrder(transformedData);

    return NextResponse.json(
      {
        message: "Order created successfully",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
