import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { RouteDatabaseService } from "@/lib/database/routes";
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

    const route = await RouteDatabaseService.getRouteById(
      params.id,
      currentUser.businessId
    );

    // Transform route for frontend
    const transformedRoute = {
      id: route.id,
      routeName: route.routeName,
      routeType: route.routeType,
      status: route.status,
      plannedDate: route.plannedDate.toISOString().split("T")[0],
      plannedStartTime: route.plannedStartTime.toISOString(),
      plannedEndTime: route.plannedEndTime?.toISOString(),
      actualStartTime: route.actualStartTime?.toISOString(),
      actualEndTime: route.actualEndTime?.toISOString(),
      totalDistance: route.totalDistance ? Number(route.totalDistance) : null,
      estimatedDuration: route.estimatedDuration,
      actualDuration: route.actualDuration,
      totalWeight: Number(route.totalWeight),
      totalItems: route.totalItems,
      optimizedFor: route.optimizedFor,
      optimizationScore: route.optimizationScore
        ? Number(route.optimizationScore)
        : null,
      estimatedCost: route.estimatedCost ? Number(route.estimatedCost) : null,
      actualCost: route.actualCost ? Number(route.actualCost) : null,
      notes: route.notes,
      driverInstructions: route.driverInstructions,
      vehicle: {
        id: route.vehicle.id,
        plateNumber: route.vehicle.plateNumber,
        brand: route.vehicle.brand,
        model: route.vehicle.model,
        maxWeightKg: Number(route.vehicle.maxWeightKg),
        maxItemCount: route.vehicle.maxItemCount,
        driver: route.vehicle.assignedDriver
          ? {
              id: route.vehicle.assignedDriver.id,
              name: `${route.vehicle.assignedDriver.firstName} ${route.vehicle.assignedDriver.lastName}`,
              phone: route.vehicle.assignedDriver.phone,
              email: route.vehicle.assignedDriver.email,
            }
          : null,
      },
      stops: route.stops.map((stop) => ({
        id: stop.id,
        sequence: stop.sequence,
        stopType: stop.stopType,
        status: stop.status,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        customerName: stop.customerName,
        customerPhone: stop.customerPhone,
        plannedArrival: stop.plannedArrival?.toISOString(),
        estimatedArrival: stop.estimatedArrival?.toISOString(),
        actualArrival: stop.actualArrival?.toISOString(),
        plannedDeparture: stop.plannedDeparture?.toISOString(),
        actualDeparture: stop.actualDeparture?.toISOString(),
        serviceTime: stop.serviceTime,
        waitingTime: stop.waitingTime,
        itemCount: stop.itemCount,
        weight: Number(stop.weight),
        specialInstructions: stop.specialInstructions,
        completionNotes: stop.completionNotes,
        photoUrl: stop.photoUrl,
        signatureUrl: stop.signatureUrl,
        failureReason: stop.failureReason,
        deliveryZone: stop.deliveryZone
          ? {
              id: stop.deliveryZone.id,
              name: stop.deliveryZone.name,
              city: stop.deliveryZone.city,
              district: stop.deliveryZone.district,
            }
          : null,
        customer: stop.customer
          ? {
              id: stop.customer.id,
              name: `${stop.customer.firstName} ${stop.customer.lastName}`,
              phone: stop.customer.phone,
              address: stop.customer.address,
            }
          : null,
        orders: stop.orders.map((so) => ({
          actionType: so.actionType,
          sequence: so.sequence,
          order: {
            id: so.order.id,
            orderNumber: so.order.orderNumber,
            status: so.order.status,
            totalAmount: Number(so.order.totalAmount),
          },
        })),
        createdAt: stop.createdAt.toISOString(),
        updatedAt: stop.updatedAt.toISOString(),
      })),
      assignments: route.assignments.map((assignment) => ({
        id: assignment.id,
        assignedAt: assignment.assignedAt.toISOString(),
        status: assignment.status,
        acceptedAt: assignment.acceptedAt?.toISOString(),
        completedAt: assignment.completedAt?.toISOString(),
        notes: assignment.notes,
        driver: {
          id: assignment.driver.id,
          name: `${assignment.driver.firstName} ${assignment.driver.lastName}`,
          phone: assignment.driver.phone,
        },
      })),
      stopCount: route._count?.stops || 0,
      assignmentCount: route._count?.assignments || 0,
      createdAt: route.createdAt.toISOString(),
      updatedAt: route.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedRoute);
  } catch (error) {
    console.error("Get route error:", error);
    if (error instanceof Error && error.message === "Route not found") {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
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

    if (body.plannedDate) {
      updateData.plannedDate = new Date(body.plannedDate);
    }

    if (body.plannedStartTime) {
      updateData.plannedStartTime = new Date(body.plannedStartTime);
    }

    if (body.plannedEndTime !== undefined) {
      updateData.plannedEndTime = body.plannedEndTime
        ? new Date(body.plannedEndTime)
        : null;
    }

    if (body.actualStartTime !== undefined) {
      updateData.actualStartTime = body.actualStartTime
        ? new Date(body.actualStartTime)
        : null;
    }

    if (body.actualEndTime !== undefined) {
      updateData.actualEndTime = body.actualEndTime
        ? new Date(body.actualEndTime)
        : null;
    }

    // Transform numeric fields
    if (body.totalDistance !== undefined) {
      updateData.totalDistance = body.totalDistance
        ? parseFloat(body.totalDistance)
        : null;
    }

    if (body.totalWeight !== undefined) {
      updateData.totalWeight = body.totalWeight
        ? parseFloat(body.totalWeight)
        : 0;
    }

    if (body.optimizationScore !== undefined) {
      updateData.optimizationScore = body.optimizationScore
        ? parseFloat(body.optimizationScore)
        : null;
    }

    if (body.estimatedCost !== undefined) {
      updateData.estimatedCost = body.estimatedCost
        ? parseFloat(body.estimatedCost)
        : null;
    }

    if (body.actualCost !== undefined) {
      updateData.actualCost = body.actualCost
        ? parseFloat(body.actualCost)
        : null;
    }

    const route = await RouteDatabaseService.updateRoute(
      params.id,
      currentUser.businessId,
      updateData
    );

    return NextResponse.json({
      message: "Route updated successfully",
      route,
    });
  } catch (error) {
    console.error("Update route error:", error);
    if (error instanceof Error) {
      if (error.message === "Route not found") {
        return NextResponse.json({ error: "Route not found" }, { status: 404 });
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

    const result = await RouteDatabaseService.deleteRoute(
      params.id,
      currentUser.businessId
    );

    return NextResponse.json({
      message: "Route deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete route error:", error);
    if (error instanceof Error) {
      if (error.message === "Route not found") {
        return NextResponse.json({ error: "Route not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
