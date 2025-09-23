import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    if (!body.vehicleId || !body.latitude || !body.longitude) {
      return NextResponse.json(
        { error: "Missing required fields: vehicleId, latitude, longitude" },
        { status: 400 }
      );
    }

    // Validate coordinates
    const latitude = parseFloat(body.latitude);
    const longitude = parseFloat(body.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude values" },
        { status: 400 }
      );
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error:
            "Latitude must be between -90 and 90, longitude between -180 and 180",
        },
        { status: 400 }
      );
    }

    // Verify vehicle belongs to user's business
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: body.vehicleId,
        businessId: currentUser.businessId,
        isActive: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found or not accessible" },
        { status: 404 }
      );
    }

    // Create tracking log entry
    const trackingLog = await prisma.vehicleTrackingLog.create({
      data: {
        vehicleId: body.vehicleId,
        driverId: body.driverId || currentUser.id,
        routeId: body.routeId,
        latitude,
        longitude,
        accuracy: body.accuracy ? parseFloat(body.accuracy) : null,
        heading: body.heading ? parseFloat(body.heading) : null,
        speed: body.speed ? parseFloat(body.speed) : null,
        status: body.status || "active",
        battery: body.battery ? parseInt(body.battery, 10) : null,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      trackingLogId: trackingLog.id,
      message: "Vehicle location updated successfully",
    });
  } catch (error) {
    console.error("Vehicle tracking API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

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
    const vehicleId = url.searchParams.get("vehicleId");
    const routeId = url.searchParams.get("routeId");
    const since = url.searchParams.get("since");
    const limit = url.searchParams.get("limit");

    const where: any = {
      vehicle: {
        businessId: currentUser.businessId,
      },
    };

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (routeId) {
      where.routeId = routeId;
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.timestamp = { gte: sinceDate };
      }
    }

    const trackingLogs = await prisma.vehicleTrackingLog.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        route: {
          select: {
            id: true,
            routeName: true,
            status: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit ? parseInt(limit, 10) : 100,
    });

    return NextResponse.json({
      success: true,
      trackingLogs,
      count: trackingLogs.length,
    });
  } catch (error) {
    console.error("Vehicle tracking GET API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
