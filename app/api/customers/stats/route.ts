import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { CustomerDatabaseService } from "@/lib/database/customers";

export async function GET(request: NextRequest) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMERS-STATS] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    // SECURITY FIX: Always use businessId from authenticated token ONLY
    const businessId = tokenUser.businessId;
    const days = parseInt(url.searchParams.get("days") || "30");

    console.log(
      `[CUSTOMERS-STATS] Getting stats for businessId: ${businessId}, days: ${days}`
    );

    // Verify user has access to this business
    if (businessId !== tokenUser.businessId) {
      return NextResponse.json(
        { error: "Access denied to this business" },
        { status: 403 }
      );
    }

    const stats = await CustomerDatabaseService.getCustomerStats(
      businessId,
      days
    );
    const topCustomers = await CustomerDatabaseService.getTopCustomers(
      businessId,
      10
    );

    const response = {
      totalCustomers: stats.total,
      activeCustomers: stats.active,
      newCustomersThisMonth: stats.newThisMonth,
      withWhatsApp: stats.withWhatsApp,
      withOrders: stats.withOrders,
      averageOrdersPerCustomer: stats.averageOrdersPerCustomer,
      byCity: stats.byCity,
      topCustomers: topCustomers.map((customer) => ({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        city: customer.city,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
      })),
    };

    console.log(`[CUSTOMERS-STATS] Returning stats:`, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get customer stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
