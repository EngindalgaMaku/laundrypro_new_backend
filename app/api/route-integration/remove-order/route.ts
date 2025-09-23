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

    const currentUser = await UserDatabaseService.getUserById(user.userId);

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { routeId, orderId } = body || {};

    if (!routeId || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: routeId, orderId" },
        { status: 400 }
      );
    }

    const result = await OrderRouteIntegrationService.removeOrderFromRoute(
      routeId,
      orderId,
      currentUser.businessId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Remove order from route API error:", error);
    if (error?.code === "ROUTE_NOT_MODIFIABLE") {
      return NextResponse.json(
        { error: error.message, code: error.code, routeStatus: error.routeStatus },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
