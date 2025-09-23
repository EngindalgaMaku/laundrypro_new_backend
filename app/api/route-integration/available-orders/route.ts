import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import OrderRouteIntegrationService from "@/lib/services/order-route-integration";

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
    const typeParams = url.searchParams.getAll("type");

    // Filter valid types and default to both pickup and delivery if no types specified
    const validTypes: ("pickup" | "delivery")[] = [];
    for (const type of typeParams) {
      if (type === "pickup" || type === "delivery") {
        validTypes.push(type);
      }
    }
    const types: ("pickup" | "delivery")[] =
      validTypes.length > 0 ? validTypes : ["pickup", "delivery"];

    const availableOrders =
      await OrderRouteIntegrationService.getOrdersReadyForRoutes(
        currentUser.businessId,
        types
      );

    return NextResponse.json({
      success: true,
      orders: availableOrders,
      count: availableOrders.length,
      message: `Found ${availableOrders.length} orders ready for route assignment`,
    });
  } catch (error) {
    console.error("Available orders API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
