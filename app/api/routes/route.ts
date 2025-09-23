import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { RouteDatabaseService } from "@/lib/database/routes";
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
    const status = url.searchParams.getAll("status");
    const routeType = url.searchParams.getAll("routeType");
    const vehicleId = url.searchParams.get("vehicleId");
    const search = url.searchParams.get("search");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const sortBy = url.searchParams.get("sortBy");
    const sortOrder = url.searchParams.get("sortOrder");

    const offset = (page - 1) * limit;

    const filters: any = {
      businessId: currentUser.businessId,
    };

    if (status.length > 0) {
      filters.status = status as any[];
    }

    if (routeType.length > 0) {
      filters.routeType = routeType as any[];
    }

    if (vehicleId) {
      filters.vehicleId = vehicleId;
    }

    if (search) {
      filters.search = search;
    }

    if (startDate && endDate) {
      filters.plannedDateRange = {
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

    const { routes, total } = await RouteDatabaseService.getRoutes(
      filters,
      limit,
      offset
    );

    // Transform routes for frontend
    const transformedRoutes = routes.map((route) => ({
      id: route.id,
      routeName: route.routeName,
      routeType: route.routeType,
      status: route.status,
      plannedDate: route.plannedDate
        ? route.plannedDate.toISOString().split("T")[0]
        : null,
      plannedStartTime: route.plannedStartTime
        ? route.plannedStartTime.toISOString()
        : null,
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
        driver: route.vehicle.assignedDriver
          ? {
              id: route.vehicle.assignedDriver.id,
              name: `${route.vehicle.assignedDriver.firstName} ${route.vehicle.assignedDriver.lastName}`,
              phone: route.vehicle.assignedDriver.phone,
            }
          : null,
      },
      stops: route.stops.map((stop) => ({
        id: stop.id,
        sequence: stop.sequence,
        stopType: stop.stopType,
        status: stop.status,
        address: stop.address,
        customerName: stop.customerName,
        latitude: stop.latitude ?? null,
        longitude: stop.longitude ?? null,
      })),
      stopCount: route._count?.stops || 0,
      createdAt: route.createdAt.toISOString(),
      updatedAt: route.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      routes: transformedRoutes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Routes API error:", error);
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
    if (!body.routeName || !body.vehicleId) {
      return NextResponse.json(
        {
          error: "Missing required fields: routeName, vehicleId",
        },
        { status: 400 }
      );
    }

    // Add business ID to the route data
    const routeData = {
      ...body,
      businessId: currentUser.businessId,
      // If not provided, plannedDate defaults to today; plannedStartTime can be null
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : new Date(),
      plannedStartTime: body.plannedStartTime
        ? new Date(body.plannedStartTime)
        : new Date(),
      plannedEndTime: body.plannedEndTime
        ? new Date(body.plannedEndTime)
        : null,
    } as any;

    const route = await RouteDatabaseService.createRoute(routeData);

    return NextResponse.json(
      {
        message: "Route created successfully",
        route,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
