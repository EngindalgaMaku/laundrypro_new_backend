import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getUserFromRequest, verifyToken } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";

export async function POST(request: NextRequest) {
  try {
    console.log("[REFRESH] Token refresh request received");
    
    // Try to get user from current token (even if expired)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Try to decode token without verification to get user info
    let tokenPayload;
    try {
      tokenPayload = jwt.decode(token) as any;
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      );
    }

    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    console.log(`[REFRESH] Attempting to refresh token for user: ${tokenPayload.userId}`);

    // Verify user still exists and is active
    let userData;
    try {
      userData = await UserDatabaseService.getUserById(tokenPayload.userId);
    } catch (error) {
      console.error("[REFRESH] User lookup failed:", error);
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      );
    }

    if (!userData.isActive) {
      return NextResponse.json(
        { error: "User account is deactivated" },
        { status: 403 }
      );
    }

    // Create new token
    const newToken = jwt.sign(
      {
        userId: userData.id,
        email: userData.email,
        businessId: userData.businessId,
        role: userData.role,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "7d" }
    );

    console.log(`[REFRESH] New token created for user: ${userData.email}`);

    return NextResponse.json({
      message: "Token refreshed successfully",
      token: newToken,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        businessId: userData.businessId,
      },
    });

  } catch (error) {
    console.error("[REFRESH] Token refresh error:", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
