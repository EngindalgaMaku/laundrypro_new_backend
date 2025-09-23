import { NextRequest, NextResponse } from "next/server";
import { validateAuthRequest } from "@/lib/auth-utils";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(request: NextRequest) {
  try {
    const validation = await validateAuthRequest(request);
    
    if (!validation.success) {
      // For mobile apps, always return 401 for auth failures to trigger re-login
      return NextResponse.json(
        { 
          error: "Authentication required",
          requiresLogin: true,
          message: "Oturum süresi doldu. Lütfen tekrar giriş yapın."
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: validation.user });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { 
        error: "Authentication required",
        requiresLogin: true,
        message: "Oturum süresi doldu. Lütfen tekrar giriş yapın."
      },
      { status: 401 }
    );
  }
}

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
    const { firstName, lastName, phone } = body;

    const updatedUser = await UserDatabaseService.updateUser(validation.user.id, {
      firstName,
      lastName,
      phone,
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
