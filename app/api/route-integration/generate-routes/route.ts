import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import OrderRouteIntegrationService from "@/lib/services/order-route-integration";

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

    // Validate required fields
    if (!body.targetDate) {
      return NextResponse.json(
        { error: "Missing required field: targetDate" },
        { status: 400 }
      );
    }

    const targetDate = new Date(body.targetDate);

    // Validate date
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for targetDate" },
        { status: 400 }
      );
    }

    const options = {
      maxDistance: body.maxDistance,
      maxDuration: body.maxDuration,
      maxStops: body.maxStops,
      prioritizeUrgent:
        body.prioritizeUrgent !== undefined ? body.prioritizeUrgent : true,
      vehicleCapacityWeight: body.vehicleCapacityWeight,
      vehicleCapacityItems: body.vehicleCapacityItems,
    };

    const result = await OrderRouteIntegrationService.generateOptimalRoutes(
      currentUser.businessId,
      targetDate,
      options
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Generate routes API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
