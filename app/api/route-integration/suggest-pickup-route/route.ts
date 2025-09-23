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
    const vehicleId = url.searchParams.get("vehicleId");
    const latitude = url.searchParams.get("latitude");
    const longitude = url.searchParams.get("longitude");
    const maxStops = url.searchParams.get("maxStops");

    if (!vehicleId || !latitude || !longitude) {
      return NextResponse.json(
        {
          error: "Missing required parameters: vehicleId, latitude, longitude",
        },
        { status: 400 }
      );
    }

    const currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    if (isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude values" },
        { status: 400 }
      );
    }

    const maxStopsLimit = maxStops ? parseInt(maxStops, 10) : 10;

    if (isNaN(maxStopsLimit) || maxStopsLimit < 1 || maxStopsLimit > 50) {
      return NextResponse.json(
        { error: "maxStops must be between 1 and 50" },
        { status: 400 }
      );
    }

    const suggestedOrders =
      await OrderRouteIntegrationService.suggestPickupRoute(
        currentUser.businessId,
        vehicleId,
        currentLocation,
        maxStopsLimit
      );

    return NextResponse.json({
      success: true,
      suggestedOrders,
      count: suggestedOrders.length,
      vehicleId,
      currentLocation,
      maxStops: maxStopsLimit,
      message: `Found ${suggestedOrders.length} optimal pickup orders for vehicle`,
    });
  } catch (error) {
    console.error("Suggest pickup route API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
