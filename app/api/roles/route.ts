import { NextRequest, NextResponse } from "next/server";
import { withOwnerOnly, AuthenticatedRequest } from "@/lib/rbac/middleware";
import { prisma } from "@/lib/db";

// GET /api/roles - List all roles (Owner only)
export const GET = withOwnerOnly(async (request: AuthenticatedRequest) => {
  try {
    console.log("GET /api/roles - Fetching roles");

    // Get all roles with permission counts
    const roles = await (prisma as any).role.findMany({
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                name: true,
                category: true,
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
          },
          where: {
            isActive: true,
            businessId: request.user!.businessId, // Only count users from same business
          },
        },
        _count: {
          select: {
            users: {
              where: {
                isActive: true,
                businessId: request.user!.businessId,
              },
            },
            permissions: true,
          },
        },
      },
      orderBy: {
        level: "desc", // Highest authority first
      },
    });

    return NextResponse.json({
      roles: roles.map((role: any) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        level: role.level,
        description: role.description,
        isActive: role.isActive,
        isSystem: role.isSystem,
        permissionCount: role._count.permissions,
        userCount: role._count.users,
        users: role.users.map((user: any) => ({
          id: user.id,
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
          isActive: user.isActive,
        })),
        permissions: role.permissions.map((rp: any) => ({
          id: rp.permission.name,
          name: rp.permission.name,
          category: rp.permission.category,
          description: rp.permission.description,
          conditions: rp.conditions ? JSON.parse(rp.conditions) : null,
        })),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
      metadata: {
        total: roles.length,
        systemRoles: roles.filter((r: any) => r.isSystem).length,
        customRoles: roles.filter((r: any) => !r.isSystem).length,
      },
    });
  } catch (error) {
    console.error("Get roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// POST /api/roles - Create custom role (Owner only)
export const POST = withOwnerOnly(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { name, displayName, description, level, permissions } = body;

    // Validate required fields
    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Missing required fields: name, displayName" },
        { status: 400 }
      );
    }

    // Validate role name format
    if (!/^[A-Z_]+$/.test(name)) {
      return NextResponse.json(
        {
          error:
            "Role name must be uppercase with underscores only (e.g., CUSTOM_ROLE)",
        },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await (prisma as any).role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    // Validate level (cannot be higher than current user's role level)
    const currentUserRole = await (prisma as any).role.findFirst({
      where: { name: request.user!.role },
    });

    if (level && level >= (currentUserRole?.level || 0)) {
      return NextResponse.json(
        { error: "Cannot create role with equal or higher authority level" },
        { status: 403 }
      );
    }

    // Create the role
    const newRole = await (prisma as any).role.create({
      data: {
        name,
        displayName,
        description: description || null,
        level: level || 1,
        isActive: true,
        isSystem: false, // Custom roles are never system roles
      },
    });

    // Assign permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const validPermissions = await (prisma as any).permission.findMany({
        where: {
          name: { in: permissions },
        },
      });

      if (validPermissions.length > 0) {
        await (prisma as any).rolePermission.createMany({
          data: validPermissions.map((perm: any) => ({
            roleId: newRole.id,
            permissionId: perm.id,
          })),
        });
      }
    }

    // Fetch complete role data
    const completeRole = await (prisma as any).role.findUnique({
      where: { id: newRole.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    console.log(`Role created: ${name} by ${request.user!.email}`);

    return NextResponse.json({
      message: "Role created successfully",
      role: {
        id: completeRole.id,
        name: completeRole.name,
        displayName: completeRole.displayName,
        level: completeRole.level,
        description: completeRole.description,
        isActive: completeRole.isActive,
        isSystem: completeRole.isSystem,
        permissionCount: completeRole._count.permissions,
        userCount: completeRole._count.users,
        permissions: completeRole.permissions.map(
          (rp: any) => rp.permission.name
        ),
      },
    });
  } catch (error: any) {
    console.error("Create role error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Role name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
