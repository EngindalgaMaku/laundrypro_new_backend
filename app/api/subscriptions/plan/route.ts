import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAuth, requireSystemAdmin } from "@/lib/auth-utils";
import { getEntitlements, getPlanForBusiness } from "@/lib/entitlements";

/**
 * GET /api/subscriptions/plan           → plan of the signed-in user's business
 * GET /api/subscriptions/plan?businessId → any business, system admins only
 * (the businessId form used to answer without any authentication)
 */
export async function GET(request: NextRequest) {
  try {
    const requested = new URL(request.url).searchParams.get("businessId");

    let businessId: string;
    if (requested) {
      const admin = await requireSystemAdmin(request);
      if (admin instanceof NextResponse) {
        const auth = await requireBusinessAuth(request);
        if (auth instanceof NextResponse) return auth;
        if (auth.businessId !== requested) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      businessId = requested;
    } else {
      const auth = await requireBusinessAuth(request);
      if (auth instanceof NextResponse) return auth;
      businessId = auth.businessId;
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
