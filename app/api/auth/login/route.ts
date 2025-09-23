import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { UserDatabaseService } from "@/lib/database/users";
import { PermissionService } from "@/lib/rbac/PermissionService";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Parse JSON with error handling
    let email: string;
    let password: string;

    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.error("[LOGIN] JSON parse error:", parseError);
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı",
          code: "INVALID_JSON_FORMAT",
        },
        { status: 400 }
      );
    }

    console.log(`[LOGIN] Login attempt for email: ${email}`);

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email ve şifre gereklidir",
          code: "MISSING_CREDENTIALS",
        },
        { status: 400 }
      );
    }

    // Check if user exists first
    try {
      const users = await UserDatabaseService.getUsers({}, 10, 0);
      console.log(`[LOGIN] Total users in database: ${users.total}`);
      console.log(`[LOGIN] Looking for email: ${email}`);

      const userExists = users.users.find((u) => u.email === email);
      if (!userExists) {
        console.log(`[LOGIN] User with email ${email} not found in database`);
        console.log(
          `[LOGIN] Available emails:`,
          users.users.map((u) => u.email)
        );
      } else {
        console.log(
          `[LOGIN] User found: ${userExists.email} (${userExists.id})`
        );
      }
    } catch (error) {
      console.error(`[LOGIN] Error checking users:`, error);
    }

    // Authenticate user using the existing service
    const user = await UserDatabaseService.authenticateUser(email, password);

    console.log(`[LOGIN] User authenticated: ${user.email} (ID: ${user.id})`);
    console.log(`[LOGIN] User business: ${user.business?.id || "none"}`);

    // Ensure we have a valid JWT secret
    if (!process.env.NEXTAUTH_SECRET) {
      console.error("[LOGIN] NEXTAUTH_SECRET is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check if user has a business association
    if (!user.business?.id) {
      console.error(`[LOGIN] User ${user.email} has no business association`);
      return NextResponse.json(
        {
          error:
            "İş yeri ataması bulunamadı. Lütfen yönetici ile iletişime geçin.",
          code: "NO_BUSINESS_ASSOCIATION",
        },
        { status: 400 }
      );
    }

    // Get user's RBAC role and permissions
    let userPermissions = null;
    let rbacRole = null;
    try {
      userPermissions = await PermissionService.getUserPermissions(user.id);
      // Get RBAC role data if available
      rbacRole = await (prisma as any).role.findFirst({
        where: { name: user.role },
        select: {
          id: true,
          name: true,
          displayName: true,
          level: true,
        },
      });
    } catch (error) {
      console.warn(
        `[LOGIN] Could not fetch RBAC data for user ${user.email}:`,
        error
      );
      // Continue without RBAC data for now
    }

    // Generate session ID
    const sessionId = `session_${user.id}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create enhanced JWT token payload
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      businessId: user.business.id,
      role: user.role,
      roleId: rbacRole?.id || null,
      sessionId: sessionId,
      permissions: userPermissions?.effectivePermissions?.slice(0, 20) || [], // Limit JWT size
      iat: Math.floor(Date.now() / 1000), // Issued at
    };

    console.log(
      `[LOGIN] Creating token with enhanced payload for user:`,
      user.email
    );

    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET, {
      expiresIn: "7d",
    });

    // Create user session record
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    try {
      await (prisma as any).userSession.create({
        data: {
          userId: user.id,
          sessionId: sessionId,
          deviceInfo: request.headers.get("user-agent") || "Unknown Device",
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "Unknown",
          lastActivity: new Date(),
          expiresAt: sessionExpiresAt,
          isActive: true,
        },
      });
      console.log(`[LOGIN] Session created for user: ${user.email}`);
    } catch (sessionError) {
      console.warn(
        `[LOGIN] Could not create session for user ${user.email}:`,
        sessionError
      );
      // Continue without session tracking for now
    }

    console.log(`[LOGIN] Enhanced login successful for user: ${user.email}`);

    // Return enhanced response with RBAC data
    return NextResponse.json({
      message: "Giriş başarılı",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        rbacRole: rbacRole,
        business: {
          id: user.business.id,
          name: user.business.name,
          businessType: user.business.businessType,
          email: (user.business as any).email || null,
          phone: (user.business as any).phone || null,
          address: (user.business as any).address || null,
        },
        permissions: userPermissions,
        sessionId: sessionId,
      },
      token,
      expiresAt: sessionExpiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Login error:", error);

    // Handle specific authentication errors
    if (error.message === "Invalid credentials") {
      return NextResponse.json(
        {
          error: "Geçersiz email veya şifre",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    } else if (error.message === "Account is inactive") {
      return NextResponse.json(
        {
          error: "Hesabınız deaktif edilmiş",
          code: "ACCOUNT_INACTIVE",
        },
        { status: 401 }
      );
    } else if (error.message && error.message.includes("User not found")) {
      return NextResponse.json(
        {
          error: "Kullanıcı bulunamadı",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    } else if (error.code === "P2002") {
      // Prisma unique constraint error
      return NextResponse.json(
        {
          error: "Veritabanı hatası",
          code: "DATABASE_ERROR",
        },
        { status: 500 }
      );
    } else if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        {
          error: "Token hatası",
          code: "TOKEN_ERROR",
        },
        { status: 500 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Sunucu hatası. Lütfen daha sonra tekrar deneyin.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
