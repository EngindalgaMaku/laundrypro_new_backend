import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, verifyToken } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { getBusinessById } from "@/lib/database/business";

export interface AuthValidationResult {
  success: boolean;
  user?: any;
  business?: any;
  error?: string;
  statusCode?: number;
}

/**
 * Comprehensive authentication validation that checks:
 * 1. JWT token validity
 * 2. User exists in database
 * 3. User is active
 * 4. Business exists (if businessId in token)
 */
export async function validateAuthRequest(request: NextRequest): Promise<AuthValidationResult> {
  try {
    // Step 1: Extract and verify JWT token
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return {
        success: false,
        error: "Invalid or missing authentication token",
        statusCode: 401
      };
    }

    console.log(`[AUTH] Validating user: ${tokenUser.userId} (${tokenUser.email})`);

    // Step 2: Check if user exists in database
    let userData;
    try {
      userData = await UserDatabaseService.getUserById(tokenUser.userId);
      
      // If user not found (stale token), return 401
      if (!userData) {
        console.log(`[AUTH] User not found for ID ${tokenUser.userId} - stale token`);
        return {
          success: false,
          error: "Invalid authentication token",
          statusCode: 401
        };
      }
    } catch (error) {
      console.error(`[AUTH] User lookup failed for ID ${tokenUser.userId}:`, error);
      return {
        success: false,
        error: "Invalid authentication token",
        statusCode: 401
      };
    }

    // Step 3: Check if user is active
    if (!userData.isActive) {
      console.log(`[AUTH] User ${tokenUser.userId} is inactive`);
      return {
        success: false,
        error: "User account is deactivated",
        statusCode: 403
      };
    }

    // Step 4: Validate business if businessId exists
    let businessData = null;
    if (tokenUser.businessId) {
      try {
        businessData = await getBusinessById(tokenUser.businessId);
        if (!businessData) {
          console.log(`[AUTH] Business ${tokenUser.businessId} not found`);
          return {
            success: false,
            error: "Associated business not found",
            statusCode: 404
          };
        }

        if (!businessData.isActive) {
          console.log(`[AUTH] Business ${tokenUser.businessId} is inactive`);
          return {
            success: false,
            error: "Associated business is deactivated",
            statusCode: 403
          };
        }
      } catch (error) {
        console.error(`[AUTH] Business lookup failed for ID ${tokenUser.businessId}:`, error);
        return {
          success: false,
          error: "Business validation failed",
          statusCode: 500
        };
      }
    }

    console.log(`[AUTH] Validation successful for user ${userData.email}`);
    return {
      success: true,
      user: userData,
      business: businessData
    };

  } catch (error) {
    console.error("[AUTH] Authentication validation error:", error);
    return {
      success: false,
      error: "Authentication validation failed",
      statusCode: 500
    };
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth(handler: (request: NextRequest, authData: { user: any, business?: any }) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const validation = await validateAuthRequest(request);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 500 }
      );
    }

    return handler(request, {
      user: validation.user!,
      business: validation.business
    });
  };
}

/**
 * Check if a JWT token is expired or about to expire
 */
export function isTokenExpiring(token: string, bufferMinutes: number = 30): boolean {
  try {
    const decoded = verifyToken(token);
    if (!decoded) return true;

    // Check if token has exp claim
    const payload = decoded as any;
    if (!payload.exp) return false;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000; // Convert minutes to milliseconds

    return (expirationTime - currentTime) <= bufferTime;
  } catch (error) {
    return true; // If we can't verify, assume it's expiring
  }
}

/**
 * Create a standardized error response for authentication failures
 */
export function createAuthErrorResponse(error: string, statusCode: number = 401): NextResponse {
  return NextResponse.json(
    { 
      error,
      timestamp: new Date().toISOString(),
      requiresReauth: statusCode === 401
    },
    { status: statusCode }
  );
}
