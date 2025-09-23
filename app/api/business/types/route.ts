import { NextRequest, NextResponse } from "next/server";
import { businessTypes } from "@/lib/business-types";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [API] Business types requested, returning:", businessTypes.length, "types");

    return NextResponse.json({
      businessTypes,
      success: true
    });
  } catch (error) {
    console.error("Business types error:", error);
    return NextResponse.json(
      { error: "Business types could not be retrieved" },
      { status: 500 }
    );
  }
}
