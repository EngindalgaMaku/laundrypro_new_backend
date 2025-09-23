import { NextRequest, NextResponse } from "next/server";
import { withOwnerOnly, AuthenticatedRequest } from "@/lib/rbac/middleware";
import { prisma } from "@/lib/db";

// GET /api/permissions - List all permissions (Owner only)
export const GET = withOwnerOnly(async (request: AuthenticatedRequest) => {
  try {
    console.log("GET /api/permissions - Fetching permissions");

    // Get all permissions with usage statistics
    const permissions = await (prisma as any).permission.findMany({
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                level: true,
                isSystem: true,
              },
            },
          },
        },
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { action: "asc" }, { name: "asc" }],
    });

    // Group permissions by category
    const permissionsByCategory = permissions.reduce((acc: any, perm: any) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }

      acc[perm.category].push({
        id: perm.id,
        name: perm.name,
        action: perm.action,
        resource: perm.resource,
        description: perm.description,
        conditions: perm.conditions ? JSON.parse(perm.conditions) : null,
        assignedToRoles: perm.rolePermissions.map((rp: any) => ({
          roleId: rp.role.id,
          roleName: rp.role.name,
          roleDisplayName: rp.role.displayName,
          roleLevel: rp.role.level,
          isSystemRole: rp.role.isSystem,
          conditions: rp.conditions ? JSON.parse(rp.conditions) : null,
        })),
        assignedRoleCount: perm._count.rolePermissions,
        createdAt: perm.createdAt,
        updatedAt: perm.updatedAt,
      });

      return acc;
    }, {});

    return NextResponse.json({
      permissions: permissionsByCategory,
      metadata: {
        totalPermissions: permissions.length,
        categories: Object.keys(permissionsByCategory),
        categoryCount: Object.keys(permissionsByCategory).length,
        mostUsedPermissions: permissions
          .sort(
            (a: any, b: any) =>
              b._count.rolePermissions - a._count.rolePermissions
          )
          .slice(0, 10)
          .map((p: any) => ({
            name: p.name,
            category: p.category,
            assignedRoles: p._count.rolePermissions,
          })),
      },
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// POST /api/permissions - Create custom permission (Owner only)
export const POST = withOwnerOnly(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { name, category, action, resource, description, conditions } = body;

    // Validate required fields
    if (!name || !category || !action || !resource) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, action, resource" },
        { status: 400 }
      );
    }

    // Validate permission name format (should be resource:action)
    if (name !== `${resource}:${action.toLowerCase()}`) {
      return NextResponse.json(
        {
          error:
            "Permission name must be in format 'resource:action' (e.g., 'orders:create')",
        },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermission = await (prisma as any).permission.findUnique({
      where: { name },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: "Permission with this name already exists" },
        { status: 400 }
      );
    }

    // Create the permission
    const newPermission = await (prisma as any).permission.create({
      data: {
        name,
        category: category.toUpperCase(),
        action: action.toUpperCase(),
        resource: resource.toLowerCase(),
        description: description || null,
        conditions: conditions ? JSON.stringify(conditions) : null,
      },
    });

    console.log(`Permission created: ${name} by ${request.user!.email}`);

    return NextResponse.json({
      message: "Permission created successfully",
      permission: {
        id: newPermission.id,
        name: newPermission.name,
        category: newPermission.category,
        action: newPermission.action,
        resource: newPermission.resource,
        description: newPermission.description,
        conditions: newPermission.conditions
          ? JSON.parse(newPermission.conditions)
          : null,
        createdAt: newPermission.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Create permission error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Permission name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
