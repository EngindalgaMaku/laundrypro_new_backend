import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { RouteDatabaseService } from "@/lib/database/routes";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stopId: string } }
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
    const status = body?.status as
      | "PENDING"
      | "IN_PROGRESS"
      | "COMPLETED"
      | "FAILED";

    if (!status) {
      return NextResponse.json({ error: "Missing field: status" }, { status: 400 });
    }

    const updated = await RouteDatabaseService.updateRouteStop(
      params.stopId,
      currentUser.businessId,
      { status }
    );

    return NextResponse.json({ message: "Stop status updated", stop: updated });
  } catch (error) {
    console.error("Update stop status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
