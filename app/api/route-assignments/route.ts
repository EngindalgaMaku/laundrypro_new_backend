import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { RouteAssignmentDatabaseService } from "@/lib/database/route-assignments";
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
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const routeId = url.searchParams.get("routeId");
    const vehicleId = url.searchParams.get("vehicleId");
    const driverId = url.searchParams.get("driverId");
    const status = url.searchParams.getAll("status");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const sortBy = url.searchParams.get("sortBy");
    const sortOrder = url.searchParams.get("sortOrder");

    const offset = (page - 1) * limit;

    const filters: any = {
      businessId: currentUser.businessId,
    };

    if (routeId) {
      filters.routeId = routeId;
    }

    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }

    if (driverId) {
      filters.driverId = driverId;
    }

    if (status.length > 0) {
      filters.status = status;
    }

    if (startDate && endDate) {
      filters.assignedDateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    if (sortBy) {
      filters.sortBy = sortBy as any;
    }

    if (sortOrder) {
      filters.sortOrder = sortOrder as "asc" | "desc";
    }

    const { assignments, total } =
      await RouteAssignmentDatabaseService.getRouteAssignments(
        filters,
        limit,
        offset
      );

    // Transform assignments for frontend
    const transformedAssignments = assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      assignedAt: assignment.assignedAt.toISOString(),
      acceptedAt: assignment.acceptedAt?.toISOString(),
      completedAt: assignment.completedAt?.toISOString(),
      notes: assignment.notes,
      route: {
        id: assignment.route.id,
        routeName: assignment.route.routeName,
        routeType: assignment.route.routeType,
        status: assignment.route.status,
        plannedDate: assignment.route.plannedDate.toISOString().split("T")[0],
        plannedStartTime: assignment.route.plannedStartTime.toISOString(),
        plannedEndTime: assignment.route.plannedEndTime?.toISOString(),
        actualStartTime: assignment.route.actualStartTime?.toISOString(),
        actualEndTime: assignment.route.actualEndTime?.toISOString(),
      },
      vehicle: {
        id: assignment.vehicle.id,
        plateNumber: assignment.vehicle.plateNumber,
        brand: assignment.vehicle.brand,
        model: assignment.vehicle.model,
        status: assignment.vehicle.status,
      },
      driver: {
        id: assignment.driver.id,
        name: `${assignment.driver.firstName} ${assignment.driver.lastName}`,
        phone: assignment.driver.phone,
        email: assignment.driver.email,
      },
      assignedBy: {
        id: assignment.assignedByUser.id,
        name: `${assignment.assignedByUser.firstName} ${assignment.assignedByUser.lastName}`,
      },
    }));

    return NextResponse.json({
      assignments: transformedAssignments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Route assignments API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    if (!body.routeId || !body.vehicleId || !body.driverId) {
      return NextResponse.json(
        { error: "Missing required fields: routeId, vehicleId, driverId" },
        { status: 400 }
      );
    }

    // Add assigner ID to the assignment data
    const assignmentData = {
      ...body,
      assignedBy: user.userId,
    };

    const assignment =
      await RouteAssignmentDatabaseService.createRouteAssignment(
        assignmentData
      );

    return NextResponse.json(
      {
        message: "Route assignment created successfully",
        assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create route assignment error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
