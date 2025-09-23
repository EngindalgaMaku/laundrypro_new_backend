import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  RBACMiddleware,
  AuthenticatedRequest,
} from "@/lib/rbac/middleware";

// GET /api/users/[id]/security - return security info for a user
export const GET = RBACMiddleware.requireUserRead(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const currentUser = request.user!;
      const { id } = await params;

      // Verify target user exists and belongs to same business
      const target = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          businessId: true,
          role: true,
          twoFactorEnabled: true,
          lastPasswordChange: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          lastLogin: true,
          sessions: {
            orderBy: { lastActivity: "desc" },
            take: 10,
            select: {
              lastActivity: true,
              ipAddress: true,
              userAgent: true,
              isActive: true,
            },
          },
        },
      });

      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (target.businessId !== currentUser.businessId) {
        return NextResponse.json(
          { error: "Access denied - user not in your business" },
          { status: 403 }
        );
      }

      const lastSession = target.sessions[0];

      // Build login history from recent sessions
      const loginHistory = target.sessions.map((s) => ({
        timestamp: s.lastActivity,
        ipAddress: s.ipAddress || "",
        userAgent: s.userAgent || "",
        success: !!s.isActive,
      }));

      // Derive simple security alerts
      const now = new Date();
      const alerts: Array<{
        id: string;
        type: string;
        message: string;
        timestamp: Date;
        isResolved: boolean;
      }> = [];

      if (target.failedLoginAttempts >= 5) {
        alerts.push({
          id: `alert-failed-${target.id}`,
          type: "FAILED_LOGINS",
          message: `Son giriş denemelerinde çok sayıda başarısız deneme (${target.failedLoginAttempts}) tespit edildi` ,
          timestamp: target.lastLogin || now,
          isResolved: false,
        });
      }

      if (target.lockedUntil && target.lockedUntil > now) {
        alerts.push({
          id: `alert-locked-${target.id}`,
          type: "ACCOUNT_LOCKED",
          message: `Hesap ${target.lockedUntil.toISOString()} tarihine kadar kilitli` ,
          timestamp: target.lockedUntil,
          isResolved: false,
        });
      }

      if (!target.twoFactorEnabled && (target.role === "OWNER" || target.role === "MANAGER")) {
        alerts.push({
          id: `alert-2fa-${target.id}`,
          type: "TWO_FACTOR_DISABLED",
          message: "Yönetici yetkileri için iki faktörlü doğrulama kapalı",
          timestamp: now,
          isResolved: false,
        });
      }

      const securityInfo = {
        twoFactorEnabled: target.twoFactorEnabled,
        lastIpAddress: lastSession?.ipAddress,
        lastDeviceInfo: lastSession?.userAgent,
        securityAlerts: alerts,
        loginHistory,
      };

      return NextResponse.json({ securityInfo }, { status: 200 });
    } catch (error) {
      console.error("GET /api/users/[id]/security error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
