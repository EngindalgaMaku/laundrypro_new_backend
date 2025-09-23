import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export async function GET() {
  try {
    const isConnected = await testConnection();

    if (isConnected) {
      return NextResponse.json(
        {
          status: "ok",
          database: "connected",
          timestamp: new Date().toISOString(),
          message: "Database connection successful",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: "error",
          database: "disconnected",
          timestamp: new Date().toISOString(),
          message: "Database connection failed",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Database health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        timestamp: new Date().toISOString(),
        message: "Database health check error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
