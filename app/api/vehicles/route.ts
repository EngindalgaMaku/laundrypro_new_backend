import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { VehicleDatabaseService } from "@/lib/database/vehicles";
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
    const search = url.searchParams.get("search");
    const assignedDriverId = url.searchParams.get("assignedDriverId");
    const isActive = url.searchParams.get("isActive");
    const hasGps = url.searchParams.get("hasGps");
    const hasRefrigeration = url.searchParams.get("hasRefrigeration");
    const canHandleFragile = url.searchParams.get("canHandleFragile");
    const sortBy = url.searchParams.get("sortBy");
    const sortOrder = url.searchParams.get("sortOrder");

    const offset = (page - 1) * limit;

    const filters: any = {
      businessId: currentUser.businessId,
    };

    if (status.length > 0) {
      filters.status = status as any[];
    }

    if (search) {
      filters.search = search;
    }

    if (assignedDriverId) {
      filters.assignedDriverId = assignedDriverId;
    }

    if (isActive !== null && isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    if (hasGps !== null && hasGps !== undefined) {
      filters.hasGps = hasGps === "true";
    }

    if (hasRefrigeration !== null && hasRefrigeration !== undefined) {
      filters.hasRefrigeration = hasRefrigeration === "true";
    }

    if (canHandleFragile !== null && canHandleFragile !== undefined) {
      filters.canHandleFragile = canHandleFragile === "true";
    }

    if (sortBy) {
      filters.sortBy = sortBy as any;
    }

    if (sortOrder) {
      filters.sortOrder = sortOrder as "asc" | "desc";
    }

    const { vehicles, total } = await VehicleDatabaseService.getVehicles(
      filters,
      limit,
      offset
    );

    // Transform vehicles for frontend
    const transformedVehicles = vehicles.map((vehicle) => ({
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      status: vehicle.status,
      isActive: vehicle.isActive,
      maxWeightKg: Number(vehicle.maxWeightKg),
      maxItemCount: vehicle.maxItemCount,
      maxVolumeM3: vehicle.maxVolumeM3 ? Number(vehicle.maxVolumeM3) : null,
      assignedDriver: vehicle.assignedDriver
        ? {
            id: vehicle.assignedDriver.id,
            name: `${vehicle.assignedDriver.firstName} ${vehicle.assignedDriver.lastName}`,
            phone: vehicle.assignedDriver.phone,
            email: vehicle.assignedDriver.email,
          }
        : null,
      hasGps: vehicle.hasGps,
      hasRefrigeration: vehicle.hasRefrigeration,
      canHandleFragile: vehicle.canHandleFragile,
      fuelCostPerKm: vehicle.fuelCostPerKm
        ? Number(vehicle.fuelCostPerKm)
        : null,
      operatingCostPerHour: vehicle.operatingCostPerHour
        ? Number(vehicle.operatingCostPerHour)
        : null,
      currentKm: vehicle.currentKm,
      nextMaintenanceKm: vehicle.nextMaintenanceKm,
      lastMaintenanceDate: vehicle.lastMaintenanceDate?.toISOString(),
      routeCount: vehicle._count?.routes || 0,
      deliveryZoneCount: vehicle._count?.deliveryZones || 0,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      vehicles: transformedVehicles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Vehicles API error:", error);
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
    if (
      !body.plateNumber ||
      !body.brand ||
      !body.model ||
      !body.maxWeightKg ||
      !body.maxItemCount
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: plateNumber, brand, model, maxWeightKg, maxItemCount",
        },
        { status: 400 }
      );
    }

    // Add business ID to the vehicle data
    const vehicleData = {
      ...body,
      businessId: currentUser.businessId,
      maxWeightKg: parseFloat(body.maxWeightKg),
      maxItemCount: parseInt(body.maxItemCount),
      maxVolumeM3: body.maxVolumeM3 ? parseFloat(body.maxVolumeM3) : undefined,
      year: body.year ? parseInt(body.year) : undefined,
      fuelCostPerKm: body.fuelCostPerKm
        ? parseFloat(body.fuelCostPerKm)
        : undefined,
      operatingCostPerHour: body.operatingCostPerHour
        ? parseFloat(body.operatingCostPerHour)
        : undefined,
      nextMaintenanceKm: body.nextMaintenanceKm
        ? parseInt(body.nextMaintenanceKm)
        : undefined,
      currentKm: body.currentKm ? parseInt(body.currentKm) : undefined,
      lastMaintenanceDate: body.lastMaintenanceDate
        ? new Date(body.lastMaintenanceDate)
        : undefined,
    };

    const vehicle = await VehicleDatabaseService.createVehicle(vehicleData);

    return NextResponse.json(
      {
        message: "Vehicle created successfully",
        vehicle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
