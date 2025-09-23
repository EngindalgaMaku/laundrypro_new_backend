import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { OrderDatabaseService } from "@/lib/database/orders";
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
    const businessId =
      url.searchParams.get("businessId") || currentUser.businessId;
    const query = url.searchParams.get("q") || "";
    const status = url.searchParams.get("status");
    const customerId = url.searchParams.get("customerId");
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
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.log(`[ORDERS-SEARCH] Search params:`, {
      businessId,
      query,
      status,
      customerId,
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
      limit,
      offset,
    });

    // Build filters for the search
    const filters: any = {
      businessId,
    };

    // Use the main query parameter or customerName as search
    const searchQuery = query || customerName;
    if (searchQuery) {
      filters.search = searchQuery;
    }

    if (status && status !== "ALL") {
      filters.status = [status as any];
    }

    if (customerId) {
      filters.customerId = customerId;
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

    console.log(`[ORDERS-SEARCH] Final filters:`, filters);

    const { orders, total } = await OrderDatabaseService.getOrders(
      filters,
      limit,
      offset
    );

    // Transform orders for frontend consistency
    const transformedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer
        ? {
            id: order.customer.id,
            name: `${order.customer.firstName} ${order.customer.lastName}`,
            phone: order.customer.phone,
            email: order.customer.email,
            address: order.customer.address,
            city: order.customer.city,
            district: order.customer.district,
          }
        : `${order.customer}`,
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
      priority: order.priority,
      isUrgent: order.priority === "URGENT" || order.priority === "HIGH",
      address: order.customer.address,
      district: order.customer.district || "",
      city: order.customer.city || "",
      customerId: order.customer.id,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pickupDate: order.pickupDate?.toISOString(),
      deliveryDate: order.deliveryDate?.toISOString(),
      notes: order.notes,
      paymentStatus: "PENDING", // Default value, can be enhanced later
      paymentMethod: order.paymentMethod,
    }));

    console.log(
      `[ORDERS-SEARCH] Found ${orders.length} orders (total: ${total})`
    );

    return NextResponse.json(transformedOrders);
  } catch (error) {
    console.error("Orders search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
