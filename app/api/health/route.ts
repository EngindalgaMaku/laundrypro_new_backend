import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple health check - just return OK if API is reachable
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        message: "API is reachable",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: "API health check failed",
      },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  // HEAD request for quick connectivity check
  try {
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
