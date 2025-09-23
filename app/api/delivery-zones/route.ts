import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { DeliveryZoneDatabaseService } from "@/lib/database/delivery-zones";
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
    const city = url.searchParams.get("city");
    const district = url.searchParams.get("district");
    const isActive = url.searchParams.get("isActive");
    const search = url.searchParams.get("search");
    const sortBy = url.searchParams.get("sortBy");
    const sortOrder = url.searchParams.get("sortOrder");

    const offset = (page - 1) * limit;

    const filters: any = {
      businessId: currentUser.businessId,
    };

    if (city) {
      filters.city = city;
    }

    if (district) {
      filters.district = district;
    }

    if (isActive !== null && isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    if (search) {
      filters.search = search;
    }

    if (sortBy) {
      filters.sortBy = sortBy as any;
    }

    if (sortOrder) {
      filters.sortOrder = sortOrder as "asc" | "desc";
    }

    const { deliveryZones, total } =
      await DeliveryZoneDatabaseService.getDeliveryZones(
        filters,
        limit,
        offset
      );

    // Transform delivery zones for frontend
    const transformedZones = deliveryZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      city: zone.city,
      district: zone.district,
      boundaries: zone.boundaries,
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
      isActive: zone.isActive,
      priority: zone.priority,
      serviceStartTime: zone.serviceStartTime,
      serviceEndTime: zone.serviceEndTime,
      serviceDays: zone.serviceDays ? JSON.parse(zone.serviceDays) : null,
      vehicles: zone.vehicles.map((vdz) => ({
        id: vdz.vehicle.id,
        plateNumber: vdz.vehicle.plateNumber,
        brand: vdz.vehicle.brand,
        model: vdz.vehicle.model,
        status: vdz.vehicle.status,
      })),
      vehicleCount: zone._count?.vehicles || 0,
      routeStopCount: zone._count?.routeStops || 0,
      createdAt: zone.createdAt.toISOString(),
      updatedAt: zone.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      deliveryZones: transformedZones,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Delivery zones API error:", error);
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
    if (!body.name || !body.city || !body.district) {
      return NextResponse.json(
        { error: "Missing required fields: name, city, district" },
        { status: 400 }
      );
    }

    // Add business ID to the delivery zone data
    const deliveryZoneData = {
      ...body,
      businessId: currentUser.businessId,
      centerLat: body.centerLat ? parseFloat(body.centerLat) : undefined,
      centerLng: body.centerLng ? parseFloat(body.centerLng) : undefined,
      priority: body.priority ? parseInt(body.priority) : undefined,
      serviceDays: body.serviceDays
        ? JSON.stringify(body.serviceDays)
        : undefined,
    };

    const deliveryZone = await DeliveryZoneDatabaseService.createDeliveryZone(
      deliveryZoneData
    );

    return NextResponse.json(
      {
        message: "Delivery zone created successfully",
        deliveryZone,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create delivery zone error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
