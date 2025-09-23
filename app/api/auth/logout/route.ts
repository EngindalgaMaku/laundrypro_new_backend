import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    console.log("[LOGOUT] Enhanced logout with session management");

    // Get user from JWT token
    const user = getUserFromRequest(request);

    if (user && user.sessionId) {
      try {
        // Deactivate the current session
        await (prisma as any).userSession.updateMany({
          where: {
            sessionId: user.sessionId,
            userId: user.userId,
            isActive: true,
          },
          data: {
            isActive: false,
            lastActivity: new Date(),
          },
        });

        console.log(`[LOGOUT] Session deactivated for user: ${user.email}`);
      } catch (sessionError) {
        console.error("Session cleanup error:", sessionError);
        // Continue with logout even if session cleanup fails
      }

      try {
        // Optional: Clean up old expired sessions for this user
        const now = new Date();
        await (prisma as any).userSession.updateMany({
          where: {
            userId: user.userId,
            OR: [{ expiresAt: { lt: now } }, { isActive: false }],
          },
          data: {
            isActive: false,
          },
        });
      } catch (cleanupError) {
        console.warn("Session cleanup error:", cleanupError);
        // Non-critical, continue
      }
    }

    // Return mobile-friendly response with session cleanup info
    return NextResponse.json({
      message: "Çıkış başarılı",
      success: true,
      clearToken: true,
      redirectTo: "/login",
      sessionCleaned: !!user?.sessionId,
    });
  } catch (error) {
    console.error("[LOGOUT] Logout error:", error);
    return NextResponse.json(
      {
        error: "Logout failed",
        clearToken: true,
        redirectTo: "/login",
        sessionCleaned: false,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to logout (for convenience)
export async function GET(request: NextRequest) {
  return POST(request);
}
