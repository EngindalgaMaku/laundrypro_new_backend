import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";




import { prisma } from "@/lib/db";
// Returns orders eligible to be added to a new route
// - Status: from CONFIRMED and later, excluding COMPLETED and CANCELLED
// - Not already attached to any route (no RouteStopOrder relation)
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search") || undefined;

    const where: any = {
      businessId: currentUser.businessId,
      status: { notIn: ["COMPLETED", "CANCELLED"] as any[] },
      // Not already in any route
      routeStopOrders: { none: {} },
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
              city: true,
              district: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    const items = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
      address: o.customer.address || "",
      city: o.customer.city || "",
      district: o.customer.district || "",
      phone: o.customer.phone || "",
      status: o.status,
    }));

    return NextResponse.json({ orders: items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Available orders API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
