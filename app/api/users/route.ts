import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getUsers, createUser, updateUser } from "@/lib/database/users";
import { prisma } from "@/lib/db";
import { RBACMiddleware, AuthenticatedRequest } from "@/lib/rbac/middleware";

// GET /api/users - List users (requires users:read permission)
export const GET = RBACMiddleware.requireUserRead(
  async (request: AuthenticatedRequest) => {
    try {
      const user = request.user!; // User is guaranteed by RBAC middleware

      console.log("GET /api/users - Looking up user:", user.userId);

      // Get current user's business ID (should be in JWT but let's verify)
      const currentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { businessId: true, role: true },
      });

      if (!currentUser?.businessId) {
        console.log("GET /api/users - User has no business associated:", {
          userId: user.userId,
          userEmail: user.email,
        });
        // Return consistent format to prevent mobile app issues
        return NextResponse.json({ users: [] });
      }

      // Get users from the same business with enhanced data including roles
      const { users, total } = await getUsers({
        businessId: currentUser.businessId,
      });

      // Return users with basic data - RBAC role data will be available after schema regeneration
      const enhancedUsers = users.map((userData: any) => {
        // Try to get RBAC role metadata from existing role enum
        const roleMetadata = {
          OWNER: { displayName: "İşletme Sahibi", level: 4 },
          MANAGER: { displayName: "Yönetici", level: 3 },
          EMPLOYEE: { displayName: "Çalışan", level: 2 },
          DRIVER: { displayName: "Sürücü", level: 1 },
        };

        return {
          ...userData,
          rbacRole:
            roleMetadata[userData.role as keyof typeof roleMetadata] || null,
        };
      });

      console.log("GET /api/users - Found users:", enhancedUsers.length);

      return NextResponse.json({
        users: enhancedUsers,
        total,
        pagination: {
          total,
          count: enhancedUsers.length,
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// POST /api/users - Create user (requires users:create permission)
export const POST = RBACMiddleware.requireUserWrite(
  async (request: AuthenticatedRequest) => {
    try {
      const user = request.user!; // User is guaranteed by RBAC middleware

      // Validate business context
      if (!user.businessId) {
        return NextResponse.json(
          { error: "Business context required" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { email, password, firstName, lastName, phone, role, roleId } =
        body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: email, password, firstName, lastName",
          },
          { status: 400 }
        );
      }

      // Validate role assignment permissions
      const requestedRole = role || "EMPLOYEE";
      const currentUserRole = user.role;

      // Only OWNER can create OWNER/MANAGER roles
      if (
        (requestedRole === "OWNER" || requestedRole === "MANAGER") &&
        currentUserRole !== "OWNER"
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions to assign this role" },
          { status: 403 }
        );
      }

      // Get role ID if roleId is provided, otherwise use the role enum
      let finalRoleId = null;
      if (roleId) {
        const targetRole = await (prisma as any).role.findUnique({
          where: { id: roleId },
        });
        if (!targetRole) {
          return NextResponse.json(
            { error: "Invalid roleId provided" },
            { status: 400 }
          );
        }
        finalRoleId = roleId;
      } else if (requestedRole) {
        const targetRole = await (prisma as any).role.findUnique({
          where: { name: requestedRole },
        });
        if (targetRole) {
          finalRoleId = targetRole.id;
        }
      }

      // Create user with enhanced RBAC data
      const userData = {
        email,
        password,
        firstName,
        lastName,
        phone,
        role: requestedRole,
        businessId: user.businessId,
      };

      const newUser = await createUser(userData);

      // Update user with roleId if available
      if (finalRoleId) {
        await prisma.user.update({
          where: { id: newUser.id },
          data: { roleId: finalRoleId } as any,
        });
      }

      return NextResponse.json({
        message: "User created successfully",
        user: {
          ...newUser,
          roleId: finalRoleId,
        },
      });
    } catch (error: any) {
      console.error("Create user error:", error);
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

// PUT /api/users - Update user (requires users:update permission)
export const PUT = RBACMiddleware.requireUserWrite(
  async (request: AuthenticatedRequest) => {
    try {
      const user = request.user!; // User is guaranteed by RBAC middleware

      // Validate business context
      if (!user.businessId) {
        return NextResponse.json(
          { error: "Business context required" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const {
        userId,
        firstName,
        lastName,
        email,
        role,
        roleId,
        isActive,
        customPermissions,
      } = body;

      if (!userId || !firstName || !lastName || !email) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: userId, firstName, lastName, email",
          },
          { status: 400 }
        );
      }

      // Verify target user is in same business
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { businessId: true, role: true },
      });

      if (!targetUser || targetUser.businessId !== user.businessId) {
        return NextResponse.json(
          { error: "User not found or access denied" },
          { status: 404 }
        );
      }

      // Check role change permissions
      const currentUserRole = user.role;
      if (role && role !== targetUser.role) {
        // Only OWNER can change roles to/from OWNER or MANAGER
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

      // Handle roleId update
      const updateData: any = {
        firstName,
        lastName,
        email,
        isActive,
      };

      if (role) {
        updateData.role = role;
      }

      if (roleId) {
        updateData.roleId = roleId;
      }

      if (customPermissions !== undefined) {
        updateData.customPermissions = JSON.stringify(customPermissions);
      }

      const updatedUser = await updateUser(userId, updateData);

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
