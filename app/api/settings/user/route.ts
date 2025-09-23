import { NextRequest, NextResponse } from "next/server";
import { validateAuthRequest } from "@/lib/auth-utils";

// Get user information for settings
export async function GET(request: NextRequest) {
  try {
    const validation = await validateAuthRequest(request);

    if (!validation.success) {
      console.error("[Settings] Auth validation failed:", validation.error);
      // For mobile apps, always return 401 for auth failures to trigger re-login
      return NextResponse.json(
        {
          error: "Authentication required",
          requiresLogin: true,
          message: "Oturum süresi doldu. Lütfen tekrar giriş yapın.",
        },
        { status: 401 }
      );
    }

    // Return settings structure that mobile service expects: { settings: UserSettings }
    const userSettings = {
      theme: "system",
      language: "tr",
      notifications: {
        enabled: true,
        sound: true,
        vibration: true,
        orderUpdates: true,
        deliveryReminders: true,
        paymentReminders: true,
        systemNotifications: true,
        marketingEmails: false,
        whatsappNotifications: true,
        pushNotifications: true,
        emailNotifications: true,
        quietHours: {
          enabled: false,
        },
      },
      defaults: {
        currency: "TRY",
        timezone: "Europe/Istanbul",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "HH:mm",
      },
      privacy: {
        profileVisibility: "business",
        shareAnalytics: true,
        shareLocation: false,
        allowTracking: true,
        dataRetention: 365,
        autoLogout: false,
        autoLogoutTime: 30,
      },
      preferences: {
        autoSync: true,
        syncInterval: 15,
        wifiOnly: false,
        backgroundRefresh: true,
        cacheSize: 100,
        offlineMode: true,
        compactMode: false,
        showTips: true,
        defaultView: "dashboard",
        itemsPerPage: 20,
      },
    };

    console.log(`[Settings] Settings returned for ${validation.user.email}`);
    return NextResponse.json({
      success: true,
      settings: userSettings, // ← Mobile service expects { settings: UserSettings }
    });
  } catch (error: any) {
    console.error("[Settings] User GET error:", error);
    return NextResponse.json(
      {
        error: "Authentication required",
        requiresLogin: true,
        message: "Oturum süresi doldu. Lütfen tekrar giriş yapın.",
      },
      { status: 401 }
    );
  }
}

// Update user information
// Update user information
// Update user information
export async function PUT(request: NextRequest) {
  try {
    const validation = await validateAuthRequest(request);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 500 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phone, email } = body;

    // Use UserDatabaseService for consistency
    const { UserDatabaseService } = await import("@/lib/database/users");
    const updatedUser = await UserDatabaseService.updateUser(
      validation.user.id,
      {
        firstName,
        lastName,
        phone,
        ...(email && { email }),
      }
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "User information updated successfully",
    });
  } catch (error: any) {
    console.error("[Settings] User PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
