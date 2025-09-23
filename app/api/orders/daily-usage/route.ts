import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { OrderDatabaseService } from "@/lib/database/orders";
import { getPlanForBusiness } from "@/lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await UserDatabaseService.getUserById(user.userId);
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const plan = await getPlanForBusiness(currentUser.businessId);
    const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_ORDER_LIMIT || "50", 10);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayCount = await OrderDatabaseService.getOrders(
      {
        businessId: currentUser.businessId,
        dateRange: { startDate: startOfDay, endDate: endOfDay },
      } as any,
      1,
      0
    ).then((res) => res.total);

    return NextResponse.json({
      success: true,
      plan,
      count: todayCount,
      limit: plan === "PRO" ? null : FREE_DAILY_LIMIT,
    });
  } catch (error: any) {
    console.error("Daily usage API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
