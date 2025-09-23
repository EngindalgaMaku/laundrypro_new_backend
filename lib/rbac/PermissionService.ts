import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface PermissionContext {
  userId: string;
  businessId: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface PermissionCheck {
  granted: boolean;
  reason?: string;
  conditions?: any;
}

export class PermissionService {
  private static permissionCache = new Map<string, any>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(
    permission: string,
    context: PermissionContext
  ): Promise<PermissionCheck> {
    try {
      // Get user with role and custom permissions
      const user = await this.getUserWithPermissions(context.userId);

      if (!user) {
        return { granted: false, reason: "User not found" };
      }

      if (!user.isActive) {
        return { granted: false, reason: "User is inactive" };
      }

      // Check business context only if provided in context (JWT may lack businessId)
      if (context.businessId && user.businessId !== context.businessId) {
        return { granted: false, reason: "Business context mismatch" };
      }

      // Check custom permissions first (user-specific overrides)
      if ((user as any).customPermissions) {
        const customPerms = JSON.parse((user as any).customPermissions);
        if (customPerms[permission] !== undefined) {
          return {
            granted: customPerms[permission],
            reason: customPerms[permission]
              ? "Custom permission granted"
              : "Custom permission denied",
          };
        }
      }

      // Determine effective roleId (fallback to enum role name if roleId is missing)
      let effectiveRoleId: string | null = (user as any).roleId || null;
      if (!effectiveRoleId && (user as any).role) {
        const roleByName = await (prisma as any).role.findUnique({
          where: { name: (user as any).role },
          select: { id: true },
        });
        effectiveRoleId = roleByName?.id || null;
      }

      // Check role-based permissions
      const hasRolePermission = await this.checkRolePermission(
        effectiveRoleId,
        permission,
        context
      );

      if (hasRolePermission.granted) {
        // Log successful access for audit
        await this.logPermissionAccess(
          context.userId,
          permission,
          "GRANTED",
          context
        );
        return hasRolePermission;
      }

      // Legacy enum-role fallback (during RBAC migration)
      if ((user as any).role) {
        const legacyRole: string = (user as any).role;
        const allowByLegacy = (perm: string) => {
          if (legacyRole === "OWNER") return true;
          if (legacyRole === "MANAGER") return perm.startsWith("users:read") || perm.startsWith("users:update") || perm === "users:read";
          if (legacyRole === "EMPLOYEE") return perm === "users:read";
          return false;
        };
        if (allowByLegacy(permission)) {
          await this.logPermissionAccess(
            context.userId,
            permission,
            "GRANTED",
            context
          );
          return { granted: true, reason: `Granted by legacy role fallback (${legacyRole})` };
        }
      }

      // Log denied access for audit
      await this.logPermissionAccess(
        context.userId,
        permission,
        "DENIED",
        context
      );
      return { granted: false, reason: "Permission not granted by role" };
    } catch (error) {
      console.error("Permission check error:", error);
      await this.logPermissionAccess(
        context.userId,
        permission,
        "ERROR",
        context
      );
      return { granted: false, reason: "Permission check failed" };
    }
  }

  /**
   * Check multiple permissions at once
   */
  static async hasPermissions(
    permissions: string[],
    context: PermissionContext
  ): Promise<Record<string, PermissionCheck>> {
    const results: Record<string, PermissionCheck> = {};

    for (const permission of permissions) {
      results[permission] = await this.hasPermission(permission, context);
    }

    return results;
  }

  /**
   * Get user with role and permission data
   */
  private static async getUserWithPermissions(userId: string) {
    const cacheKey = `user_permissions_${userId}`;
    const cached = this.permissionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rbacRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      } as any,
    });

    // Cache the result
    this.permissionCache.set(cacheKey, {
      data: user,
      timestamp: Date.now(),
    });

    return user;
  }

  /**
   * Check if role has specific permission
   */
  private static async checkRolePermission(
    roleId: string | null,
    permission: string,
    context: PermissionContext
  ): Promise<PermissionCheck> {
    if (!roleId) {
      return { granted: false, reason: "No role assigned" };
    }

    const rolePermission = await (prisma as any).rolePermission.findFirst({
      where: {
        roleId: roleId,
        permission: {
          name: permission,
        },
      },
      include: {
        permission: true,
        role: true,
      },
    });

    if (!rolePermission) {
      return { granted: false, reason: "Permission not assigned to role" };
    }

    // Check conditional permissions
    if (rolePermission.conditions) {
      const conditions = JSON.parse(rolePermission.conditions);
      const conditionCheck = await this.evaluateConditions(conditions, context);

      if (!conditionCheck.granted) {
        return conditionCheck;
      }
    }

    return {
      granted: true,
      reason: `Permission granted via role: ${rolePermission.role.displayName}`,
      conditions: rolePermission.conditions
        ? JSON.parse(rolePermission.conditions)
        : null,
    };
  }

  /**
   * Evaluate conditional permissions
   */
  private static async evaluateConditions(
    conditions: any,
    context: PermissionContext
  ): Promise<PermissionCheck> {
    try {
      // Resource ownership check
      if (conditions.resourceOwnership && context.resourceId) {
        const isOwner = await this.checkResourceOwnership(
          context.userId,
          conditions.resourceType,
          context.resourceId,
          context.businessId
        );

        if (!isOwner) {
          return { granted: false, reason: "Resource ownership required" };
        }
      }

      // Business scope check
      if (conditions.businessScope === "own" && context.businessId) {
        // Already validated in main permission check
      }

      // Time-based restrictions
      if (conditions.timeRestrictions) {
        const timeCheck = this.checkTimeRestrictions(
          conditions.timeRestrictions
        );
        if (!timeCheck.granted) {
          return timeCheck;
        }
      }

      return { granted: true };
    } catch (error) {
      console.error("Condition evaluation error:", error);
      return { granted: false, reason: "Condition evaluation failed" };
    }
  }

  /**
   * Check if user owns a specific resource
   */
  private static async checkResourceOwnership(
    userId: string,
    resourceType: string,
    resourceId: string,
    businessId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case "order":
          const order = await prisma.order.findFirst({
            where: {
              id: resourceId,
              businessId: businessId,
              assignedUserId: userId,
            },
          });
          return !!order;

        case "customer":
          // For customers, check if user's business matches
          const customer = await prisma.customer.findFirst({
            where: {
              id: resourceId,
              businessId: businessId,
            },
          });
          return !!customer;

        case "user":
          // For user management, check if target user is in same business
          const targetUser = await prisma.user.findFirst({
            where: {
              id: resourceId,
              businessId: businessId,
            },
          });
          return !!targetUser;

        default:
          return false;
      }
    } catch (error) {
      console.error("Resource ownership check error:", error);
      return false;
    }
  }

  /**
   * Check time-based restrictions
   */
  private static checkTimeRestrictions(restrictions: any): PermissionCheck {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    if (restrictions.allowedHours) {
      const { start, end } = restrictions.allowedHours;
      if (currentHour < start || currentHour > end) {
        return {
          granted: false,
          reason: `Access restricted to hours ${start}:00 - ${end}:00`,
        };
      }
    }

    if (restrictions.allowedDays) {
      if (!restrictions.allowedDays.includes(currentDay)) {
        return {
          granted: false,
          reason: "Access restricted by day of week",
        };
      }
    }

    return { granted: true };
  }

  /**
   * Log permission access for audit trail
   */
  private static async logPermissionAccess(
    userId: string,
    permission: string,
    result: "GRANTED" | "DENIED" | "ERROR",
    context: PermissionContext
  ) {
    try {
      await (prisma as any).permissionAuditLog.create({
        data: {
          userId: userId,
          action: "ACCESSED",
          resource: permission.split(":")[0] || "unknown",
          resourceId: context.resourceId || null,
          permission: permission,
          result: result,
          metadata: JSON.stringify({
            businessId: context.businessId,
            timestamp: new Date().toISOString(),
            ...context.metadata,
          }),
          ipAddress: context.metadata?.ipAddress || null,
          userAgent: context.metadata?.userAgent || null,
        },
      });
    } catch (error) {
      console.error("Failed to log permission access:", error);
    }
  }

  /**
   * Get user's effective permissions (role + custom)
   */
  static async getUserPermissions(userId: string): Promise<{
    role: any;
    rolePermissions: string[];
    customPermissions: Record<string, boolean>;
    effectivePermissions: string[];
  }> {
    const user = await this.getUserWithPermissions(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const rolePermissions =
      (user as any).rbacRole?.permissions?.map(
        (rp: any) => rp.permission.name
      ) || [];
    const customPermissions = (user as any).customPermissions
      ? JSON.parse((user as any).customPermissions)
      : {};

    // Calculate effective permissions
    const effectivePermissions = new Set(rolePermissions);

    // Apply custom permission overrides
    Object.entries(customPermissions).forEach(([perm, granted]) => {
      if (granted) {
        effectivePermissions.add(perm);
      } else {
        effectivePermissions.delete(perm);
      }
    });

    return {
      role: (user as any).rbacRole,
      rolePermissions,
      customPermissions,
      effectivePermissions: Array.from(effectivePermissions) as string[],
    };
  }

  /**
   * Grant custom permission to user
   */
  static async grantCustomPermission(
    userId: string,
    permission: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const customPermissions = (user as any).customPermissions
      ? JSON.parse((user as any).customPermissions)
      : {};
    customPermissions[permission] = true;

    await prisma.user.update({
      where: { id: userId },
      data: {
        customPermissions: JSON.stringify(customPermissions),
      } as any,
    });

    // Clear permission cache for this user
    this.clearUserCache(userId);
  }

  /**
   * Revoke custom permission from user
   */
  static async revokeCustomPermission(
    userId: string,
    permission: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const customPermissions = (user as any).customPermissions
      ? JSON.parse((user as any).customPermissions)
      : {};
    customPermissions[permission] = false;

    await prisma.user.update({
      where: { id: userId },
      data: {
        customPermissions: JSON.stringify(customPermissions),
      } as any,
    });

    // Clear permission cache for this user
    this.clearUserCache(userId);
  }

  /**
   * Clear permission cache for a user
   */
  static clearUserCache(userId: string): void {
    const cacheKey = `user_permissions_${userId}`;
    this.permissionCache.delete(cacheKey);
  }

  /**
   * Clear all permission caches
   */
  static clearAllCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Get permission audit logs
   */
  static async getAuditLogs(
    filters: {
      userId?: string;
      resource?: string;
      action?: string;
      result?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.result) where.result = filters.result;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      (prisma as any).permissionAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      (prisma as any).permissionAuditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
