import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessAuth } from "@/lib/auth-utils";

const TIMESTAMP_COLUMN: Record<string, string> = {
  viewed: "shown_at",
  dismissed: "dismissed_at",
  acted_upon: "acted_upon_at",
};

/**
 * POST /api/business/suggestions/track
 * Track suggestion interactions (viewed, dismissed, acted upon)
 */
export async function POST(request: NextRequest) {
  try {
    // Business from the signed-in user's token; the x-business-id header was client-controlled
    const auth = await requireBusinessAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { businessId } = auth;

    const body = await request.json();
    const { suggestionId, action, metadata = {} } = body;

    if (!suggestionId || !action) {
      return NextResponse.json(
        { error: "Suggestion ID and action are required" },
        { status: 400 }
      );
    }

    const now = new Date();

    switch (action) {
      case "viewed":
        break;
      case "dismissed":
        break;
      case "acted_upon":
        // Create expansion history record
        try {
          const suggestion = (await prisma.$queryRaw`
            SELECT * FROM service_suggestions 
            WHERE id = ${suggestionId} AND business_id = ${businessId}
          `) as any[];

          if (suggestion.length > 0) {
            const suggestionData = suggestion[0];
            await prisma.$executeRaw`
              INSERT INTO service_expansion_history 
              (id, business_id, service_type, expansion_reason, suggestion_id, created_at)
              VALUES (${`exp_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`}, 
                      ${businessId}, 
                      ${suggestionData.suggested_service_type}, 
                      'SUGGESTION', 
                      ${suggestionId}, 
                      ${now})
            `;
          }
        } catch (error) {
          console.error("Error creating expansion history:", error);
        }
        break;
      default:
        return NextResponse.json(
          {
            error: "Invalid action. Must be: viewed, dismissed, or acted_upon",
          },
          { status: 400 }
        );
    }

    // Update the suggestion. The old first attempt spliced a raw string into the query and
    // always threw; the column name comes from the fixed TIMESTAMP_COLUMN map
    await prisma.$executeRawUnsafe(
      `UPDATE service_suggestions SET ${TIMESTAMP_COLUMN[action]} = ? WHERE id = ? AND business_id = ?`,
      now.toISOString().slice(0, 19).replace("T", " "),
      suggestionId,
      businessId
    );

    return NextResponse.json({
      success: true,
      message: `Suggestion ${action} tracked successfully`,
      suggestionId,
      action,
      timestamp: now,
    });
  } catch (error: any) {
    console.error("Track suggestions API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to track suggestion interaction",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/business/suggestions/track
 * Get suggestion interaction analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Business from the signed-in user's token; the x-business-id header was client-controlled
    const auth = await requireBusinessAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { businessId } = auth;

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get analytics data
    const analytics = (await prisma.$queryRaw`
      SELECT 
        suggestion_type,
        COUNT(*) as total_suggestions,
        COUNT(CASE WHEN shown_at IS NOT NULL THEN 1 END) as shown_suggestions,
        COUNT(CASE WHEN dismissed_at IS NOT NULL THEN 1 END) as dismissed_suggestions,
        COUNT(CASE WHEN acted_upon_at IS NOT NULL THEN 1 END) as acted_upon_suggestions,
        CASE 
          WHEN COUNT(CASE WHEN shown_at IS NOT NULL THEN 1 END) > 0 
          THEN ROUND((COUNT(CASE WHEN acted_upon_at IS NOT NULL THEN 1 END) * 100.0) / COUNT(CASE WHEN shown_at IS NOT NULL THEN 1 END), 2)
          ELSE 0 
        END as conversion_rate
      FROM service_suggestions
      WHERE business_id = ${businessId}
        AND created_at >= ${sinceDate
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")}
      GROUP BY suggestion_type
    `) as any[];

    // Get recent suggestions
    const recentSuggestions = (await prisma.$queryRaw`
      SELECT 
        id,
        suggestion_type,
        suggested_service_type,
        reason,
        priority,
        shown_at,
        dismissed_at,
        acted_upon_at,
        created_at
      FROM service_suggestions
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
      LIMIT 10
    `) as any[];

    return NextResponse.json({
      success: true,
      analytics: analytics.map((row: any) => ({
        type: row.suggestion_type,
        totalSuggestions: Number(row.total_suggestions),
        shownSuggestions: Number(row.shown_suggestions),
        dismissedSuggestions: Number(row.dismissed_suggestions),
        actedUponSuggestions: Number(row.acted_upon_suggestions),
        conversionRate: Number(row.conversion_rate),
      })),
      recentSuggestions: recentSuggestions.map((row: any) => ({
        id: row.id,
        type: row.suggestion_type,
        serviceType: row.suggested_service_type,
        reason: row.reason,
        priority: row.priority,
        status: row.acted_upon_at
          ? "acted_upon"
          : row.dismissed_at
          ? "dismissed"
          : row.shown_at
          ? "shown"
          : "pending",
        createdAt: row.created_at,
        shownAt: row.shown_at,
        dismissedAt: row.dismissed_at,
        actedUponAt: row.acted_upon_at,
      })),
      period: `${days} days`,
    });
  } catch (error: any) {
    console.error("Get suggestions analytics API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to get suggestion analytics",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
