import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getOrders } from "@/lib/database/orders";
import { withDatabaseErrorHandling, testConnection } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("[DEBUG] Delivery orders API called");

    // Test database connection first
    const isDbConnected = await testConnection();
    if (!isDbConnected) {
      console.log("[DEBUG] Database connection failed");
      return NextResponse.json(
        {
          error:
            "Veritabanı bağlantısı başarısız. İnternet bağlantınızı kontrol ediniz.",
          type: "database_connection",
        },
        { status: 503 }
      );
    }

    const user = getUserFromRequest(request);

    if (!user) {
      console.log("[DEBUG] User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.businessId) {
      console.log("[DEBUG] User has no businessId");
      return NextResponse.json(
        { error: "Business not found" },
        { status: 400 }
      );
    }

    // Get orders that are ready for delivery
    console.log(
      "[DEBUG] Fetching delivery orders for businessId:",
      user.businessId
    );

    // Wrap database operation with error handling
    const { orders } = await withDatabaseErrorHandling(
      () =>
        getOrders(
          {
            businessId: user.businessId!,
            status: ["READY_FOR_DELIVERY"],
          },
          50,
          0
        ),
      "Delivery orders fetch"
    );

    // Transform to delivery format
    const deliveryOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        address: order.customer.address || "Adres belirtilmemiş",
        phone: order.customer.phone,
        whatsapp: order.customer.phone, // Assuming phone is whatsapp for now
        email: order.customer.email,
      },
      priority:
        order.priority.toLowerCase() === "normal"
          ? "medium"
          : order.priority.toLowerCase(),
      estimatedTime: "15 dk", // You can calculate this based on distance
      status: "pending" as const,
    }));

    return NextResponse.json(deliveryOrders);
  } catch (error) {
    console.error("Delivery orders error:", error);

    // Handle Turkish error messages from database wrapper
    if (
      error instanceof Error &&
      error.message.includes("İnternet bağlantınızı kontrol ediniz")
    ) {
      return NextResponse.json(
        {
          error: error.message,
          type: "network_error",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Sunucu hatası. Lütfen tekrar deneyin.",
        type: "server_error",
      },
      { status: 500 }
    );
  }
}
