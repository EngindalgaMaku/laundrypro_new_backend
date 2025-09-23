import { NextResponse } from "next/server";
import { testConnection, getDatabaseHealth, prisma } from "@/lib/db";

export async function GET() {
  try {
    console.log("🔍 Debug endpoint called");

    // Environment check
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Not set",
      DATABASE_URL_PREVIEW: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.substring(0, 20)}...`
        : "undefined",
    };

    console.log("📋 Environment Info:", envInfo);

    // Database health check
    const health = await getDatabaseHealth();
    console.log("🏥 Database Health:", health);

    // Basic connection test
    let connectionTest;
    try {
      connectionTest = await testConnection(5000);
      console.log("🔗 Connection Test Result:", connectionTest);
    } catch (error) {
      console.error("❌ Connection Test Failed:", error);
      connectionTest = false;
    }

    // Try a simple query
    let queryTest;
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      queryTest = { success: true, result };
      console.log("✅ Query Test Success:", result);
    } catch (error) {
      queryTest = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      console.error("❌ Query Test Failed:", error);
    }

    // Try to check if tables exist
    let tablesCheck;
    try {
      const tables = await prisma.$queryRaw`SHOW TABLES`;
      tablesCheck = { success: true, tables };
      console.log("📊 Tables Check:", tables);
    } catch (error) {
      tablesCheck = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      console.error("❌ Tables Check Failed:", error);
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: envInfo,
      databaseHealth: health,
      connectionTest,
      queryTest,
      tablesCheck,
    };

    console.log("🎯 Final Debug Info:", debugInfo);

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("💥 Debug endpoint error:", error);

    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
