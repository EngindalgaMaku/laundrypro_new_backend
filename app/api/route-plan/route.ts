import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import { ORDER_GROUPS } from "@/lib/order-status";

// Which orders each route type visits: pickups not yet collected, and finished work going back
// out (including what is already on the van)
const ROUTE_STATUSES = {
  pickup: [...ORDER_GROUPS.pickup.statuses],
  delivery: [...ORDER_GROUPS.delivery.statuses, ...ORDER_GROUPS.outForDelivery.statuses],
} as const;

type RouteType = "pickup" | "delivery" | "all";

// Approximate business locations are not saved (a better lookup or the settings may fix the
// address later), so they are kept here to avoid a paced lookup on every route load
const approximateStarts = new Map<string, { latitude: number; longitude: number }>();

/**
 * Stops for the route screen: one stop per customer with the orders to collect or deliver there,
 * and the business as the start/end point. Ordering happens on the device (lib/route-order.ts).
 */
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const type = (request.nextUrl.searchParams.get("type") || "all") as RouteType;
  if (!["pickup", "delivery", "all"].includes(type)) {
    return NextResponse.json({ error: "Geçersiz rota türü" }, { status: 400 });
  }
  const statuses =
    type === "all" ? [...ROUTE_STATUSES.pickup, ...ROUTE_STATUSES.delivery] : [...ROUTE_STATUSES[type]];

  try {
    const [business, orders] = await Promise.all([
      prisma.business.findUnique({
        where: { id: user.businessId },
        select: { name: true, address: true, district: true, city: true, latitude: true, longitude: true },
      }),
      prisma.order.findMany({
        where: { businessId: user.businessId, status: { in: statuses as any } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          orderNumber: true,
          status: true,
          priority: true,
          totalAmount: true,
          pickupAddress: true,
          deliveryAddress: true,
          payments: { where: { status: "PAID" }, select: { amount: true } },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
              district: true,
              city: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      }),
    ]);

    // The start point: located once from the business address, then kept
    let start = null as null | { latitude: number; longitude: number; label: string; approximate: boolean };
    if (business) {
      let { latitude, longitude } = business;
      let approximate = false;
      const cacheKey = `${user.businessId}|${business.address}|${business.district}|${business.city}`;
      const cached = approximateStarts.get(cacheKey);
      if ((latitude == null || longitude == null) && cached) {
        ({ latitude, longitude } = cached);
        approximate = true;
      }
      if (latitude == null || longitude == null) {
        const found = await geocodeAddress(business);
        if (found) {
          latitude = found.latitude;
          longitude = found.longitude;
          approximate = found.precision !== "address";
          if (!approximate) {
            await prisma.business.update({ where: { id: user.businessId }, data: { latitude, longitude } });
          } else {
            approximateStarts.set(cacheKey, { latitude, longitude });
          }
        }
      }
      if (latitude != null && longitude != null) {
        start = { latitude, longitude, label: business.name, approximate };
      }
    }

    const stops = new Map<string, any>();
    for (const order of orders) {
      const kind = (ROUTE_STATUSES.pickup as readonly string[]).includes(order.status) ? "pickup" : "delivery";
      const c = order.customer;
      const key = `${c.id}:${kind}`;
      const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Math.max(0, Number(order.totalAmount) - paid);
      const orderAddress = kind === "pickup" ? order.pickupAddress : order.deliveryAddress;
      const stop = stops.get(key) ?? {
        id: key,
        kind,
        customerId: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        phone: c.phone,
        address: orderAddress || c.address || "",
        district: c.district,
        city: c.city,
        // An order-specific address has no coordinates of its own
        customAddress: !!orderAddress,
        latitude: orderAddress ? null : c.latitude,
        longitude: orderAddress ? null : c.longitude,
        urgent: false,
        remaining: 0,
        orders: [] as Array<{ id: string; orderNumber: string; status: string }>,
      };
      stop.orders.push({ id: order.id, orderNumber: order.orderNumber, status: order.status });
      stop.remaining = Number((stop.remaining + remaining).toFixed(2));
      stop.urgent = stop.urgent || order.priority === "URGENT" || order.priority === "HIGH";
      stops.set(key, stop);
    }

    return NextResponse.json({ start, stops: [...stops.values()] });
  } catch (error) {
    console.error("Route plan error:", error);
    return NextResponse.json({ error: "Rota hazırlanamadı" }, { status: 500 });
  }
}
