import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { prisma } from "@/lib/db";
import {
  RBACMiddleware,
  AuthenticatedRequest,
  extractResourceId,
} from "@/lib/rbac/middleware";
import { PermissionService } from "@/lib/rbac/PermissionService";

// GET /api/users/[id] - Get specific user (requires users:read permission)
export const GET = RBACMiddleware.requireUserRead(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = request.user!; // User is guaranteed by RBAC middleware
      const { id } = await params;

      console.log("GET /api/users/[id] - Getting user:", id);

      // Verify business context - user can only access users from same business
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { businessId: true, role: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (targetUser.businessId !== user.businessId) {
        return NextResponse.json(
          {
            error: "Access denied - user not in your business",
          },
          { status: 403 }
        );
      }

      // Get detailed user data
      const userData = await UserDatabaseService.getUserById(id);
      if (!userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get user permissions and role information
      try {
        const userPermissions = await PermissionService.getUserPermissions(id);

        const roleMetadata = {
          OWNER: { displayName: "İşletme Sahibi", level: 4 },
          MANAGER: { displayName: "Yönetici", level: 3 },
          EMPLOYEE: { displayName: "Çalışan", level: 2 },
          DRIVER: { displayName: "Sürücü", level: 1 },
        };

        return NextResponse.json({
          user: {
            ...userData,
            permissions: userPermissions,
            roleMetadata:
              roleMetadata[userData.role as keyof typeof roleMetadata] || null,
          },
        });
      } catch (permError) {
        // If permission service fails, return basic user data
        console.error("Permission service error:", permError);
        return NextResponse.json({ user: userData });
      }
    } catch (error) {
      console.error("Get user error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// PUT /api/users/[id] - Update specific user (requires users:update permission)
export const PUT = RBACMiddleware.requireUserWrite(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = request.user!; // User is guaranteed by RBAC middleware
      const { id } = await params;
      const body = await request.json();
      const {
        firstName,
        lastName,
        email,
        phone,
        role,
        roleId,
        isActive,
        customPermissions,
      } = body;

      console.log("PUT /api/users/[id] - Updating user:", id);

      // Verify business context and permissions
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { businessId: true, role: true, email: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (targetUser.businessId !== user.businessId) {
        return NextResponse.json(
          {
            error: "Access denied - user not in your business",
          },
          { status: 403 }
        );
      }

      // Check role modification permissions
      const currentUserRole = user.role;
      if (role && role !== targetUser.role) {
        // Only OWNER can modify OWNER/MANAGER roles
        if (
          (role === "OWNER" ||
            role === "MANAGER" ||
            targetUser.role === "OWNER" ||
            targetUser.role === "MANAGER") &&
          currentUserRole !== "OWNER"
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions to modify this user's role" },
            { status: 403 }
          );
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;
      if (roleId) updateData.roleId = roleId;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (customPermissions !== undefined) {
        updateData.customPermissions = JSON.stringify(customPermissions);
      }

      const updatedUser = await UserDatabaseService.updateUser(id, updateData);

      // Clear permission cache if permissions were modified
      if (customPermissions !== undefined || roleId || role) {
        PermissionService.clearUserCache(id);
      }

      return NextResponse.json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error: any) {
      console.error("Update user error:", error);
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/users/[id] - Deactivate user (requires users:delete permission)
export const DELETE = RBACMiddleware.requireUserManagement(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = request.user!; // User is guaranteed by RBAC middleware
      const { id } = await params;

      console.log("DELETE /api/users/[id] - Deactivating user:", id);

      // Verify business context and permissions
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { businessId: true, role: true, email: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (targetUser.businessId !== user.businessId) {
        return NextResponse.json(
          {
            error: "Access denied - user not in your business",
          },
          { status: 403 }
        );
      }

      // Prevent self-deletion
      if (id === user.userId) {
        return NextResponse.json(
          {
            error: "Cannot delete your own account",
          },
          { status: 400 }
        );
      }

      // Check role deletion permissions
      const currentUserRole = user.role;
      if (
        (targetUser.role === "OWNER" || targetUser.role === "MANAGER") &&
        currentUserRole !== "OWNER"
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions to delete this user" },
          { status: 403 }
        );
      }

      // Soft delete (deactivate) the user
      await UserDatabaseService.updateUser(id, { isActive: false });

      // Clear permission cache
      PermissionService.clearUserCache(id);

      return NextResponse.json({
        message: "User deactivated successfully",
        action: "deactivated",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// POST /api/users/[id]/permissions - Manage user custom permissions (requires users:update + advanced permissions)
export async function POST(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can manage custom permissions
    if (user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only business owners can manage custom permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, permission } = body; // action: 'grant' | 'revoke', permission: string

    if (!action || !permission) {
      return NextResponse.json(
        { error: "Missing required fields: action, permission" },
        { status: 400 }
      );
    }

    // Verify business context
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { businessId: true, email: true },
    });

    if (!targetUser || targetUser.businessId !== user.businessId) {
      return NextResponse.json(
        { error: "User not found or access denied" },
        { status: 404 }
      );
    }

    // Grant or revoke custom permission
    if (action === "grant") {
      await PermissionService.grantCustomPermission(id, permission);
    } else if (action === "revoke") {
      await PermissionService.revokeCustomPermission(id, permission);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'grant' or 'revoke'" },
        { status: 400 }
      );
    }

    // Get updated permissions
    const updatedPermissions = await PermissionService.getUserPermissions(id);

    return NextResponse.json({
      message: `Permission ${action}ed successfully`,
      user: { email: targetUser.email },
      permission,
      action,
      updatedPermissions,
    });
  } catch (error) {
    console.error("Manage permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
