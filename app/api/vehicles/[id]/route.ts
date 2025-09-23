import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { VehicleDatabaseService } from "@/lib/database/vehicles";
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

    const vehicle = await VehicleDatabaseService.getVehicleById(
      params.id,
      currentUser.businessId
    );

    // Transform vehicle for frontend
    const transformedVehicle = {
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
      business: vehicle.business,
      deliveryZones: vehicle.deliveryZones.map((vdz) => ({
        id: vdz.deliveryZone.id,
        name: vdz.deliveryZone.name,
        city: vdz.deliveryZone.city,
        district: vdz.deliveryZone.district,
      })),
      activeRoutes: vehicle.routes.map((route) => ({
        id: route.id,
        routeName: route.routeName,
        status: route.status,
        plannedDate: route.plannedDate?.toISOString(),
      })),
      routeCount: vehicle._count?.routes || 0,
      trackingLogCount: vehicle._count?.trackingLogs || 0,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedVehicle);
  } catch (error) {
    console.error("Get vehicle error:", error);
    if (error instanceof Error && error.message === "Vehicle not found") {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
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

    // Transform numeric fields
    const updateData: any = { ...body };

    if (body.maxWeightKg !== undefined) {
      updateData.maxWeightKg = parseFloat(body.maxWeightKg);
    }

    if (body.maxItemCount !== undefined) {
      updateData.maxItemCount = parseInt(body.maxItemCount);
    }

    if (body.maxVolumeM3 !== undefined) {
      updateData.maxVolumeM3 = body.maxVolumeM3
        ? parseFloat(body.maxVolumeM3)
        : null;
    }

    if (body.year !== undefined) {
      updateData.year = body.year ? parseInt(body.year) : null;
    }

    if (body.fuelCostPerKm !== undefined) {
      updateData.fuelCostPerKm = body.fuelCostPerKm
        ? parseFloat(body.fuelCostPerKm)
        : null;
    }

    if (body.operatingCostPerHour !== undefined) {
      updateData.operatingCostPerHour = body.operatingCostPerHour
        ? parseFloat(body.operatingCostPerHour)
        : null;
    }

    if (body.nextMaintenanceKm !== undefined) {
      updateData.nextMaintenanceKm = body.nextMaintenanceKm
        ? parseInt(body.nextMaintenanceKm)
        : null;
    }

    if (body.currentKm !== undefined) {
      updateData.currentKm = body.currentKm ? parseInt(body.currentKm) : 0;
    }

    if (body.lastMaintenanceDate !== undefined) {
      updateData.lastMaintenanceDate = body.lastMaintenanceDate
        ? new Date(body.lastMaintenanceDate)
        : null;
    }

    const vehicle = await VehicleDatabaseService.updateVehicle(
      params.id,
      currentUser.businessId,
      updateData
    );

    return NextResponse.json({
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    console.error("Update vehicle error:", error);
    if (error instanceof Error) {
      if (error.message === "Vehicle not found") {
        return NextResponse.json(
          { error: "Vehicle not found" },
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

    const result = await VehicleDatabaseService.deleteVehicle(
      params.id,
      currentUser.businessId
    );

    return NextResponse.json({
      message: "Vehicle deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    if (error instanceof Error) {
      if (error.message === "Vehicle not found") {
        return NextResponse.json(
          { error: "Vehicle not found" },
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
