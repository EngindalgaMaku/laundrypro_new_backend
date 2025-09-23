import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { getBusinessById } from "@/lib/database/business";

export async function GET(request: NextRequest) {
  try {
    console.log("=== DEBUG AUTH ENDPOINT ===");
    
    // Check if we can extract user from request
    const user = getUserFromRequest(request);
    console.log("User from JWT token:", user);
    
    if (!user) {
      return NextResponse.json({ 
        error: "No user found in token",
        debug: {
          hasAuthHeader: !!request.headers.get("Authorization"),
          authHeader: request.headers.get("Authorization")?.substring(0, 20) + "...",
        }
      }, { status: 401 });
    }

    // Try to find user in database
    let userData = null;
    let userError = null;
    try {
      userData = await UserDatabaseService.getUserById(user.userId);
    } catch (error) {
      userError = error instanceof Error ? error.message : "Unknown error";
      console.error("User lookup error:", error);
    }

    // Try to find business if businessId exists
    let businessData = null;
    let businessError = null;
    if (user.businessId) {
      try {
        businessData = await getBusinessById(user.businessId);
      } catch (error) {
        businessError = error instanceof Error ? error.message : "Unknown error";
        console.error("Business lookup error:", error);
      }
    }

    // Check if user exists in database with different ID
    let allUsers = null;
    try {
      const result = await UserDatabaseService.getUsers({}, 10, 0);
      allUsers = result.users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        businessId: u.businessId
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
    }

    return NextResponse.json({
      debug: {
        tokenData: user,
        userFound: !!userData,
        userError,
        businessFound: !!businessData,
        businessError,
        allUsers: allUsers?.slice(0, 5), // First 5 users for debugging
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { 
        error: "Debug endpoint failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
