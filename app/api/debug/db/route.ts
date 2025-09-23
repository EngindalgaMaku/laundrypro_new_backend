import { NextRequest, NextResponse } from "next/server";
import { getDatabaseHealth, testConnection } from "@/lib/db";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(request: NextRequest) {
  try {
    console.log("=== DATABASE DEBUG ENDPOINT ===");
    
    // Test basic database connection
    const connectionTest = await testConnection(5000);
    console.log("Connection test result:", connectionTest);

    // Get database health metrics
    const healthCheck = await getDatabaseHealth();
    console.log("Health check result:", healthCheck);

    // Test user count query
    let userCount = 0;
    let userCountError = null;
    try {
      const result = await UserDatabaseService.getUsers({}, 1, 0);
      userCount = result.total;
    } catch (error) {
      userCountError = error instanceof Error ? error.message : "Unknown error";
      console.error("User count error:", error);
    }

    // Test sample user lookup
    let sampleUsers: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      businessId: string | null;
    }> = [];
    let sampleUsersError = null;
    try {
      const result = await UserDatabaseService.getUsers({}, 10, 0);
      sampleUsers = result.users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        businessId: u.businessId
      }));
      console.log("All users in database:", sampleUsers);
    } catch (error) {
      sampleUsersError = error instanceof Error ? error.message : "Unknown error";
      console.error("Sample users error:", error);
    }

    return NextResponse.json({
      debug: {
        timestamp: new Date().toISOString(),
        connection: {
          test: connectionTest,
          health: healthCheck
        },
        users: {
          count: userCount,
          countError: userCountError,
          samples: sampleUsers,
          samplesError: sampleUsersError
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + "...",
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
        }
      }
    });
  } catch (error) {
    console.error("Database debug endpoint error:", error);
    return NextResponse.json(
      { 
        error: "Database debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
