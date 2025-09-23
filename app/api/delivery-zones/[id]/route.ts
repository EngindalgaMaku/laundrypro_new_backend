import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { DeliveryZoneDatabaseService } from "@/lib/database/delivery-zones";
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

    const deliveryZone = await DeliveryZoneDatabaseService.getDeliveryZoneById(
      params.id,
      currentUser.businessId
    );

    // Transform delivery zone for frontend
    const transformedZone = {
      id: deliveryZone.id,
      name: deliveryZone.name,
      city: deliveryZone.city,
      district: deliveryZone.district,
      boundaries: deliveryZone.boundaries,
      centerLat: deliveryZone.centerLat,
      centerLng: deliveryZone.centerLng,
      isActive: deliveryZone.isActive,
      priority: deliveryZone.priority,
      serviceStartTime: deliveryZone.serviceStartTime,
      serviceEndTime: deliveryZone.serviceEndTime,
      serviceDays: deliveryZone.serviceDays
        ? JSON.parse(deliveryZone.serviceDays)
        : null,
      business: deliveryZone.business,
      vehicles: deliveryZone.vehicles.map((vdz) => ({
        id: vdz.vehicle.id,
        plateNumber: vdz.vehicle.plateNumber,
        brand: vdz.vehicle.brand,
        model: vdz.vehicle.model,
        status: vdz.vehicle.status,
        maxWeightKg: Number(vdz.vehicle.maxWeightKg),
        maxItemCount: vdz.vehicle.maxItemCount,
        driver: vdz.vehicle.assignedDriver
          ? {
              id: vdz.vehicle.assignedDriver.id,
              name: `${vdz.vehicle.assignedDriver.firstName} ${vdz.vehicle.assignedDriver.lastName}`,
              phone: vdz.vehicle.assignedDriver.phone,
            }
          : null,
      })),
      recentRouteStops: deliveryZone.routeStops.map((stop) => ({
        id: stop.id,
        address: stop.address,
        stopType: stop.stopType,
        status: stop.status,
        route: {
          id: stop.route.id,
          routeName: stop.route.routeName,
          status: stop.route.status,
          plannedDate: stop.route.plannedDate?.toISOString(),
        },
        createdAt: stop.createdAt.toISOString(),
      })),
      vehicleCount: deliveryZone._count?.vehicles || 0,
      routeStopCount: deliveryZone._count?.routeStops || 0,
      createdAt: deliveryZone.createdAt.toISOString(),
      updatedAt: deliveryZone.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedZone);
  } catch (error) {
    console.error("Get delivery zone error:", error);
    if (error instanceof Error && error.message === "Delivery zone not found") {
      return NextResponse.json(
        { error: "Delivery zone not found" },
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

    // Transform numeric fields
    const updateData: any = { ...body };

    if (body.centerLat !== undefined) {
      updateData.centerLat = body.centerLat ? parseFloat(body.centerLat) : null;
    }

    if (body.centerLng !== undefined) {
      updateData.centerLng = body.centerLng ? parseFloat(body.centerLng) : null;
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority ? parseInt(body.priority) : 1;
    }

    if (body.serviceDays !== undefined) {
      updateData.serviceDays = body.serviceDays
        ? JSON.stringify(body.serviceDays)
        : null;
    }

    const deliveryZone = await DeliveryZoneDatabaseService.updateDeliveryZone(
      params.id,
      currentUser.businessId,
      updateData
    );

    return NextResponse.json({
      message: "Delivery zone updated successfully",
      deliveryZone,
    });
  } catch (error) {
    console.error("Update delivery zone error:", error);
    if (error instanceof Error) {
      if (error.message === "Delivery zone not found") {
        return NextResponse.json(
          { error: "Delivery zone not found" },
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

    const result = await DeliveryZoneDatabaseService.deleteDeliveryZone(
      params.id,
      currentUser.businessId
    );

    return NextResponse.json({
      message: "Delivery zone deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete delivery zone error:", error);
    if (error instanceof Error) {
      if (error.message === "Delivery zone not found") {
        return NextResponse.json(
          { error: "Delivery zone not found" },
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
