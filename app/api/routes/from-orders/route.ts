import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { OrderDatabaseService } from "@/lib/database/orders";
import { RouteDatabaseService } from "@/lib/database/routes";
import LocationService, { Coordinates } from "@/lib/services/location-service";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await UserDatabaseService.getUserById(user.userId);
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      routeName,
      vehicleId,
      orderIds,
      driverLocation, // { lat, lng } optional - used for proximity ordering
    } = body || {};

    if (!routeName || !vehicleId || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: routeName, vehicleId, orderIds[]",
        },
        { status: 400 }
      );
    }

    // Fetch orders to build stops (keep provided orderIds order for now)
    const fetchedOrders = await Promise.all(
      orderIds.map((id: string) =>
        OrderDatabaseService.getOrderById(id, currentUser.businessId as string)
      )
    );

    // Create the route with sensible defaults for scheduling
    const now = new Date();
    const route = await RouteDatabaseService.createRoute({
      businessId: currentUser.businessId,
      vehicleId,
      routeName,
      routeType: "MIXED" as any,
      plannedDate: now,
      plannedStartTime: now,
    } as any);

    // Decide pickup vs delivery per order by status, then build candidates
    const PICKUP_STATUSES = new Set([
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "READY_FOR_PICKUP",
    ]);
    const DELIVERY_STATUSES = new Set([
      "READY_FOR_DELIVERY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ]);

    const flatCandidates = (
      await Promise.all(
        fetchedOrders.map(async (order) => {
          const customerName = [order.customer?.firstName, order.customer?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || "Müşteri";

          const wantsPickup = PICKUP_STATUSES.has(order.status as any);
          const wantsDelivery = DELIVERY_STATUSES.has(order.status as any);

          // If neither set includes the status (edge), default to pickup
          const chosenKind = wantsDelivery && !wantsPickup ? "DELIVERY" : "PICKUP";

          const chosenAddress =
            chosenKind === "PICKUP"
              ? order.pickupAddress || order.customer?.address || ""
              : order.deliveryAddress || order.customer?.address || "";
          const city = (order as any)?.customer?.city;
          const geo = await LocationService.geocodeAddress(chosenAddress, city).catch(() => null);

          return {
            kind: chosenKind as any,
            order,
            address: chosenAddress || "Adres belirtilmedi",
            customerName,
            customerPhone: order.customer?.phone || undefined,
            coordinates: geo || undefined,
          };
        })
      )
    ).filter(Boolean);

    // If driverLocation provided and we have coordinates, sort by proximity
    let ordered = flatCandidates;
    if (
      driverLocation &&
      typeof driverLocation.lat === "number" &&
      typeof driverLocation.lng === "number"
    ) {
      const origin: Coordinates = {
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
      };
      ordered = [...flatCandidates]
        .filter((c) => c.coordinates)
        .sort(
          (a, b) =>
            LocationService.calculateDistance(origin, a.coordinates!) -
            LocationService.calculateDistance(origin, b.coordinates!)
        )
        .concat(flatCandidates.filter((c) => !c.coordinates));
    }

    let sequence = 1;
    for (const c of ordered) {
      await RouteDatabaseService.addStopToRoute({
        routeId: (route as any).id,
        stopType: c.kind as any,
        sequence: sequence++,
        address: c.address,
        customerId: c.order.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        latitude: c.coordinates?.latitude,
        longitude: c.coordinates?.longitude,
      });
    }

    // Return created route id
    return NextResponse.json(
      {
        message: "Route created from orders successfully",
        routeId: (route as any).id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create route from orders error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
