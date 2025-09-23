import { NextRequest, NextResponse } from "next/server";
import { withOwnerOnly, AuthenticatedRequest } from "@/lib/rbac/middleware";
import { prisma } from "@/lib/db";
import { PermissionService } from "@/lib/rbac/PermissionService";

// GET /api/roles/[id] - Get specific role (Owner only)
export const GET = withOwnerOnly(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      console.log("GET /api/roles/[id] - Getting role:", id);

      // Get role with permissions and users
      const role = await (prisma as any).role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  action: true,
                  resource: true,
                  description: true,
                },
              },
            },
          },
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              lastLogin: true,
            },
            where: {
              businessId: request.user!.businessId, // Only users from same business
            },
          },
          _count: {
            select: {
              users: {
                where: {
                  businessId: request.user!.businessId,
                  isActive: true,
                },
              },
              permissions: true,
            },
          },
        },
      });

      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      return NextResponse.json({
        role: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          level: role.level,
          description: role.description,
          isActive: role.isActive,
          isSystem: role.isSystem,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
          permissionCount: role._count.permissions,
          userCount: role._count.users,
          permissions: role.permissions.map((rp: any) => ({
            id: rp.permission.id,
            name: rp.permission.name,
            category: rp.permission.category,
            action: rp.permission.action,
            resource: rp.permission.resource,
            description: rp.permission.description,
            conditions: rp.conditions ? JSON.parse(rp.conditions) : null,
          })),
          users: role.users.map((user: any) => ({
            id: user.id,
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
          })),
        },
      });
    } catch (error) {
      console.error("Get role error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// PUT /api/roles/[id] - Update role (Owner only)
export const PUT = withOwnerOnly(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { displayName, description, level, permissions, isActive } = body;

      console.log("PUT /api/roles/[id] - Updating role:", id);

      // Get existing role
      const existingRole = await (prisma as any).role.findUnique({
        where: { id },
        include: {
          permissions: true,
        },
      });

      if (!existingRole) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      // Prevent modification of system roles' core properties
      if (existingRole.isSystem) {
        // Only allow description updates for system roles
        const updateData: any = {};
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (Object.keys(updateData).length > 0) {
          await (prisma as any).role.update({
            where: { id },
            data: updateData,
          });
        }

        return NextResponse.json({
          message: "System role updated (limited fields only)",
          role: { id, ...updateData },
        });
      }

      // Validate level for custom roles
      if (level !== undefined) {
        const currentUserRole = await (prisma as any).role.findFirst({
          where: { name: request.user!.role },
        });

        if (level >= (currentUserRole?.level || 0)) {
          return NextResponse.json(
            {
              error:
                "Cannot set role level equal to or higher than your authority",
            },
            { status: 403 }
          );
        }
      }

      // Update role
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (level !== undefined) updateData.level = level;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedRole = await (prisma as any).role.update({
        where: { id },
        data: updateData,
      });

      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        // Remove existing permissions
        await (prisma as any).rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Add new permissions
        if (permissions.length > 0) {
          const validPermissions = await (prisma as any).permission.findMany({
            where: {
              name: { in: permissions },
            },
          });

          if (validPermissions.length > 0) {
            await (prisma as any).rolePermission.createMany({
              data: validPermissions.map((perm: any) => ({
                roleId: id,
                permissionId: perm.id,
              })),
            });
          }
        }

        // Clear permission cache for users with this role
        try {
          const roleUsers = await prisma.user.findMany({
            where: { roleId: id } as any,
            select: { id: true },
          });

          roleUsers.forEach((user) => {
            PermissionService.clearUserCache(user.id);
          });
        } catch (error) {
          // Handle case where roleId field might not be available yet
          console.warn(
            "Could not clear user caches, roleId field may not be available:",
            error
          );
        }
      }

      return NextResponse.json({
        message: "Role updated successfully",
        role: updatedRole,
      });
    } catch (error: any) {
      console.error("Update role error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/roles/[id] - Delete custom role (Owner only)
export const DELETE = withOwnerOnly(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      console.log("DELETE /api/roles/[id] - Deleting role:", id);

      // Get role
      const role = await (prisma as any).role.findUnique({
        where: { id },
        include: {
          users: {
            where: {
              businessId: request.user!.businessId,
            },
          },
        },
      });

      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      // Prevent deletion of system roles
      if (role.isSystem) {
        return NextResponse.json(
          { error: "Cannot delete system roles" },
          { status: 400 }
        );
      }

      // Check if role has assigned users
      if (role.users.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete role with assigned users",
            assignedUsers: role.users.length,
            suggestion: "Reassign users to different roles first",
          },
          { status: 400 }
        );
      }

      // Delete role permissions first
      await (prisma as any).rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Delete the role
      await (prisma as any).role.delete({
        where: { id },
      });

      return NextResponse.json({
        message: "Role deleted successfully",
        deletedRole: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
        },
      });
    } catch (error) {
      console.error("Delete role error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
