import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { RouteAssignmentDatabaseService } from "@/lib/database/route-assignments";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const assignment =
      await RouteAssignmentDatabaseService.getRouteAssignmentById(
        params.id,
        currentUser.businessId
      );

    // Transform assignment for frontend
    const transformedAssignment = {
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
        totalDistance: assignment.route.totalDistance
          ? Number(assignment.route.totalDistance)
          : null,
        estimatedDuration: assignment.route.estimatedDuration,
        actualDuration: assignment.route.actualDuration,
        totalWeight: Number(assignment.route.totalWeight),
        totalItems: assignment.route.totalItems,
        notes: assignment.route.notes,
        driverInstructions: assignment.route.driverInstructions,
        stops: assignment.route.stops.map((stop) => ({
          id: stop.id,
          sequence: stop.sequence,
          stopType: stop.stopType,
          status: stop.status,
          address: stop.address,
          customerName: stop.customerName,
          itemCount: stop.itemCount,
          weight: Number(stop.weight),
        })),
      },
      vehicle: {
        id: assignment.vehicle.id,
        plateNumber: assignment.vehicle.plateNumber,
        brand: assignment.vehicle.brand,
        model: assignment.vehicle.model,
        status: assignment.vehicle.status,
        maxWeightKg: Number(assignment.vehicle.maxWeightKg),
        maxItemCount: assignment.vehicle.maxItemCount,
        hasGps: assignment.vehicle.hasGps,
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
    };

    return NextResponse.json(transformedAssignment);
  } catch (error) {
    console.error("Get route assignment error:", error);
    if (
      error instanceof Error &&
      error.message === "Route assignment not found"
    ) {
      return NextResponse.json(
        { error: "Route assignment not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Transform date fields
    const updateData: any = { ...body };

    if (body.acceptedAt !== undefined) {
      updateData.acceptedAt = body.acceptedAt
        ? new Date(body.acceptedAt)
        : null;
    }

    if (body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt
        ? new Date(body.completedAt)
        : null;
    }

    const assignment =
      await RouteAssignmentDatabaseService.updateRouteAssignment(
        params.id,
        currentUser.businessId,
        updateData
      );

    return NextResponse.json({
      message: "Route assignment updated successfully",
      assignment,
    });
  } catch (error) {
    console.error("Update route assignment error:", error);
    if (error instanceof Error) {
      if (error.message === "Route assignment not found") {
        return NextResponse.json(
          { error: "Route assignment not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await RouteAssignmentDatabaseService.deleteRouteAssignment(
      params.id,
      currentUser.businessId
    );

    return NextResponse.json({
      message: "Route assignment deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete route assignment error:", error);
    if (error instanceof Error) {
      if (error.message === "Route assignment not found") {
        return NextResponse.json(
          { error: "Route assignment not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
