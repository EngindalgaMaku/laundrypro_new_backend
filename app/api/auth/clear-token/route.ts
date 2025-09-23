import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[CLEAR-TOKEN] Token clear request received");
    
    // Mobil app'e token temizleme talimatı ver
    return NextResponse.json({
      message: "Token temizlendi",
      success: true,
      clearToken: true,
      requiresLogin: true,
      redirectTo: "/login",
      userMessage: "Oturum süresi doldu. Lütfen tekrar giriş yapın."
    });
  } catch (error) {
    console.error("[CLEAR-TOKEN] Clear token error:", error);
    return NextResponse.json(
      { 
        error: "Token clear failed",
        clearToken: true,
        requiresLogin: true,
        redirectTo: "/login"
      },
      { status: 200 } // 200 döndür ki mobil app handle edebilsin
    );
  }
}

export async function GET(request: NextRequest) {
  // GET request için de aynı response
  return NextResponse.json({
    message: "Token temizlendi",
    success: true,
    clearToken: true,
    requiresLogin: true,
    redirectTo: "/login",
    userMessage: "Oturum süresi doldu. Lütfen tekrar giriş yapın."
  });
}
