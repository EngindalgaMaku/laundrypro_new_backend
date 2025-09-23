import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { getEntitlements, getPlanForBusiness } from "@/lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const businessIdParam = url.searchParams.get("businessId");

    let businessId = businessIdParam || "";

    if (!businessId) {
      // Try from token
      const user = getUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const currentUser = await UserDatabaseService.getUserById(user.userId);
      if (!currentUser?.businessId) {
        return NextResponse.json(
          { error: "Business not found for user" },
          { status: 400 }
        );
      }
      businessId = currentUser.businessId;
    }

    const plan = await getPlanForBusiness(businessId);
    const entitlements = await getEntitlements(businessId);

    return NextResponse.json({ success: true, plan, entitlements });
  } catch (error: any) {
    console.error("Subscriptions plan API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
