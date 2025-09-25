import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    // SECURITY FIX: Always use businessId from authenticated token ONLY
    const businessId = user.businessId;
    const limit = parseInt(searchParams.get("limit") || "20");

    // Verify user has access to the requested business
    if (businessId !== user.businessId) {
      return NextResponse.json(
        { error: "Access denied to this business" },
        { status: 403 }
      );
    }

    // Get activity data from order status history and other sources
    const activities = await prisma.orderStatusHistory.findMany({
      where: {
        order: {
          businessId: businessId,
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Transform to match frontend Activity interface
    const transformedActivities = activities.map((activity) => {
      const customerName = `${activity.order.customer.firstName} ${activity.order.customer.lastName}`;
      const userName = activity.user
        ? `${activity.user.firstName} ${activity.user.lastName}`
        : "Sistem";

      // Map status to activity type
      let activityType: string;
      let title: string;
      let description: string;

      switch (activity.status.toLowerCase()) {
        case "pending":
          activityType = "order_created";
          title = "Yeni Sipariş";
          description = `${customerName} için ${activity.order.orderNumber} numaralı sipariş oluşturuldu`;
          break;
        case "completed":
          activityType = "order_completed";
          title = "Sipariş Tamamlandı";
          description = `${customerName} - ${activity.order.orderNumber} numaralı sipariş tamamlandı`;
          break;
        case "cancelled":
          activityType = "order_cancelled";
          title = "Sipariş İptal Edildi";
          description = `${customerName} - ${activity.order.orderNumber} numaralı sipariş iptal edildi`;
          break;
        case "in_progress":
          activityType = "order_created";
          title = "Sipariş İşlemde";
          description = `${customerName} - ${activity.order.orderNumber} numaralı sipariş işleme alındı`;
          break;
        default:
          activityType = "order_created";
          title = "Sipariş Durumu Güncellendi";
          description = `${customerName} - ${activity.order.orderNumber} durumu ${activity.status} olarak güncellendi`;
      }

      return {
        id: activity.id,
        type: activityType,
        title: title,
        description: description,
        timestamp: activity.createdAt.toISOString(),
        icon: getActivityIcon(activityType),
        relatedId: activity.orderId,
      };
    });

    return NextResponse.json(transformedActivities);
  } catch (error) {
    console.error("Get dashboard activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getActivityIcon(type: string): string {
  switch (type) {
    case "order_created":
      return "📄";
    case "order_completed":
      return "✅";
    case "customer_added":
      return "👤";
    case "payment_received":
      return "💰";
    case "order_cancelled":
      return "❌";
    default:
      return "📋";
  }
}
