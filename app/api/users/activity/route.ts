import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get user activity logs (placeholder implementation)
    // In a real app, you'd have an activity log table
    const activities = await prisma.orderStatusHistory.findMany({
      where: userId ? { changedBy: userId } : {},
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Transform to match mobile app expectations
    const transformedActivities = activities.map((activity) => ({
      id: activity.id,
      userId: activity.changedBy,
      action: activity.status.toLowerCase(),
      description: `Sipariş ${activity.order.orderNumber} durumu ${activity.status} olarak değiştirildi`,
      timestamp: activity.createdAt,
      ipAddress: null, // Not tracked currently
      userAgent: null, // Not tracked currently
    }));

    return NextResponse.json({
      activities: transformedActivities,
    });
  } catch (error) {
    console.error("Get user activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
