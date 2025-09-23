import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { OrderDatabaseService } from "@/lib/database/orders";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Stats API - Request received");
    const user = getUserFromRequest(request);

    if (!user) {
      console.log("📊 Stats API - No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await UserDatabaseService.getUserById(user.userId);
    console.log(
      "📊 Stats API - Current user:",
      currentUser?.id,
      "Business:",
      currentUser?.businessId
    );

    if (!currentUser?.businessId) {
      console.log("📊 Stats API - No business ID found");
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const businessId =
      url.searchParams.get("businessId") || currentUser.businessId;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    console.log("📊 Stats API - Parameters:", {
      businessId,
      startDate,
      endDate,
    });

    // Build filters for stats calculation
    const filters: any = {
      businessId: businessId,
    };

    if (startDate && endDate) {
      filters.dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    // Get all orders for this business to calculate stats
    const { orders, total } = await OrderDatabaseService.getOrders(
      filters,
      1000, // Get a large number to calculate accurate stats
      0
    );

    // Calculate stats by status
    const stats = {
      total,
      pending: orders.filter((order) => order.status === "PENDING").length,
      confirmed: orders.filter((order) => order.status === "CONFIRMED").length,
      inProgress: orders.filter((order) => order.status === "IN_PROGRESS")
        .length,
      readyForPickup: orders.filter(
        (order) => order.status === "READY_FOR_PICKUP"
      ).length,
      readyForDelivery: orders.filter(
        (order) => order.status === "READY_FOR_DELIVERY"
      ).length,
      outForDelivery: orders.filter(
        (order) => order.status === "OUT_FOR_DELIVERY"
      ).length,
      delivered: orders.filter((order) => order.status === "DELIVERED").length,
      completed: orders.filter((order) => order.status === "COMPLETED").length,
      cancelled: orders.filter((order) => order.status === "CANCELLED").length,
    };

    // Calculate monthly revenue (current month by default)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startOfMonth && orderDate <= endOfMonth;
    });

    const monthRevenue = monthlyOrders
      .filter(
        (order) => order.status === "COMPLETED" || order.status === "DELIVERED"
      )
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return NextResponse.json({
      ...stats,
      monthRevenue,
    });
  } catch (error) {
    console.error("Orders stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
