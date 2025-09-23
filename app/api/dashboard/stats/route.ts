import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDashboardStats } from "@/lib/database/orders";
import { withDatabaseErrorHandling, testConnection } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("[DEBUG] Dashboard stats API called");

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

    console.log("[DEBUG] Fetching stats for businessId:", user.businessId);

    // Wrap database operation with error handling
    const stats = await withDatabaseErrorHandling(
      () => getDashboardStats(user.businessId!),
      "Dashboard stats fetch"
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);

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
