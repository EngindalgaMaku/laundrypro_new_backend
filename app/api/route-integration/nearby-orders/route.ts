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
    const latitude = url.searchParams.get("latitude");
    const longitude = url.searchParams.get("longitude");
    const radius = url.searchParams.get("radius");

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Missing required parameters: latitude, longitude" },
        { status: 400 }
      );
    }

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    if (isNaN(location.latitude) || isNaN(location.longitude)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude values" },
        { status: 400 }
      );
    }

    const radiusKm = radius ? parseFloat(radius) : 5; // Default 5km radius

    const nearbyOrders =
      await OrderRouteIntegrationService.getNearbyDeliveryOrders(
        currentUser.businessId,
        location,
        radiusKm
      );

    return NextResponse.json({
      success: true,
      orders: nearbyOrders,
      count: nearbyOrders.length,
      location,
      radiusKm,
      message: `Found ${nearbyOrders.length} delivery orders within ${radiusKm}km`,
    });
  } catch (error) {
    console.error("Nearby orders API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
