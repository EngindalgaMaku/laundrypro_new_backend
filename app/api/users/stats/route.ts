import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    // Get user statistics for the business
    const stats = await UserDatabaseService.getUserStats(
      currentUser.businessId
    );

    // Transform to match mobile app expectations
    const transformedStats = {
      totalUsers: stats.total,
      activeUsers: stats.active,
      usersByRole: stats.byRole,
      recentLogins: stats.activeToday, // Recent logins (today)
    };

    return NextResponse.json({ stats: transformedStats });
  } catch (error) {
    console.error("Get user stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
