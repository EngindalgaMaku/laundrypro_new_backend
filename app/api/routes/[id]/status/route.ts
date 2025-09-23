import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { RouteDatabaseService } from "@/lib/database/routes";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await UserDatabaseService.getUserById(user.userId);
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action: "start" | "finish" = body?.action;
    if (!action) {
      return NextResponse.json({ error: "Missing field: action" }, { status: 400 });
    }

    const routeId = params.id;
    const now = new Date();

    if (action === "start") {
      const updated = await RouteDatabaseService.updateRoute(routeId, currentUser.businessId, {
        status: "IN_PROGRESS" as any,
        actualStartTime: now,
      });
      return NextResponse.json({ message: "Route started", route: updated });
    }

    if (action === "finish") {
      const updated = await RouteDatabaseService.updateRoute(routeId, currentUser.businessId, {
        status: "COMPLETED" as any,
        actualEndTime: now,
      });
      return NextResponse.json({ message: "Route completed", route: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update route status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
