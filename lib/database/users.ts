import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export interface UserFilters {
  businessId?: string;
  role?: UserRole[];
  isActive?: boolean;
  search?: string; // Search in name, email
  hasBusinessAccess?: boolean;
  sortBy?: "createdAt" | "firstName" | "lastName" | "email" | "lastLogin";
  sortOrder?: "asc" | "desc";
}

export interface CreateUserData {
  businessId?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
  businessId?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
  newThisMonth: number;
  activeToday: number;
  businessUsers: number;
  systemUsers: number;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  businessId: string | null;
  businessName?: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  assignedOrdersCount: number;
}

export class UserDatabaseService {
  /**
   * Create a new user
   */
  static async createUser(data: CreateUserData) {
    // Check if user with same email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        businessId: data.businessId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        isActive: data.isActive ?? true,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
          },
        },
      },
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get users with filters and pagination
   */
  static async getUsers(
    filters: UserFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {};

    if (filters.businessId) {
      where.businessId = filters.businessId;
    }

    if (filters.role && filters.role.length > 0) {
      where.role = { in: filters.role };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    if (filters.hasBusinessAccess !== undefined) {
      if (filters.hasBusinessAccess) {
        where.businessId = { not: null };
      } else {
        where.businessId = null;
      }
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              businessType: true,
            },
          },
          _count: {
            select: {
              assignedOrders: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // Remove password hashes from response
    const usersWithoutPasswords = users.map((user) => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return { users: usersWithoutPasswords, total };
  }

  /**
   * Get user by ID with detailed information
   */
  static async getUserById(userId: string) {
    console.log(`[DEBUG] getUserById called with userId: ${userId}`);
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              businessType: true,
              city: true,
              address: true,
            },
          },
          assignedOrders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10, // Last 10 assigned orders
          },
          _count: {
            select: {
              assignedOrders: true,
              statusChanges: true,
            },
          },
        },
      });

      console.log(`[DEBUG] Database query result for userId ${userId}:`, user ? "Found" : "Not found");

      if (!user) {
        console.log(`[DEBUG] User not found with ID: ${userId}`);
        // DON'T throw error, just return null for stale tokens
        return null;
      }

      console.log(`[DEBUG] User found: ${user.email} (${user.id})`);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error(`[DEBUG] Error in getUserById for userId ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, data: UpdateUserData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
          },
        },
        _count: {
          select: {
            assignedOrders: true,
          },
        },
      },
    });

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, data: ChangePasswordData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Reset user password (admin only)
   */
  static async resetPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            assignedOrders: true,
            statusChanges: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user._count.assignedOrders > 0 || user._count.statusChanges > 0) {
      // Soft delete - mark as inactive
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
      return { success: true, softDeleted: true };
    } else {
      // Hard delete if no related data
      await prisma.user.delete({
        where: { id: userId },
      });
      return { success: true, softDeleted: false };
    }
  }

  /**
   * Authenticate user
   */
  static async authenticateUser(email: string, password: string) {
    console.log(`[AUTH] Attempting to authenticate user: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
            isActive: true,
          },
        },
      },
    });

    console.log(`[AUTH] User found in database:`, !!user);
    
    if (!user) {
      // Let's check what users actually exist
      const allUsers = await prisma.user.findMany({
        select: { email: true, firstName: true, lastName: true },
        take: 5
      });
      console.log(`[AUTH] Available users in database:`, allUsers);
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is inactive");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user statistics
   */
  static async getUserStats(businessId?: string): Promise<UserStats> {
    const thisMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {};
    if (businessId) {
      where.businessId = businessId;
    }

    const [
      totalUsers,
      activeUsers,
      usersByRole,
      newThisMonth,
      activeToday,
      businessUsers,
      systemUsers,
    ] = await Promise.all([
      // Total users
      prisma.user.count({ where }),

      // Active users
      prisma.user.count({
        where: { ...where, isActive: true },
      }),

      // Users by role
      prisma.user.groupBy({
        by: ["role"],
        where,
        _count: { id: true },
      }),

      // New users this month
      prisma.user.count({
        where: {
          ...where,
          createdAt: { gte: thisMonth },
        },
      }),

      // Active today (logged in today)
      prisma.user.count({
        where: {
          ...where,
          lastLogin: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Users with business access
      prisma.user.count({
        where: {
          ...where,
          businessId: { not: null },
        },
      }),

      // System users (no business)
      prisma.user.count({
        where: {
          ...where,
          businessId: null,
        },
      }),
    ]);

    const byRole = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalUsers,
      active: activeUsers,
      byRole,
      newThisMonth,
      activeToday,
      businessUsers,
      systemUsers,
    };
  }

  /**
   * Get users summary for dashboard
   */
  static async getUsersSummary(
    businessId?: string,
    limit: number = 50
  ): Promise<UserSummary[]> {
    const where: any = {};
    if (businessId) {
      where.businessId = businessId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        business: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            assignedOrders: true,
          },
        },
      },
      orderBy: { lastLogin: "desc" },
      take: limit,
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      businessId: user.businessId,
      businessName: user.business?.name || null,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      assignedOrdersCount: user._count.assignedOrders,
    }));
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(
    query: string,
    businessId?: string,
    limit: number = 10
  ) {
    const where: any = {
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { email: { contains: query } },
      ],
      isActive: true,
    };

    if (businessId) {
      where.businessId = businessId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        businessId: true,
      },
      take: limit,
    });

    return users;
  }

  /**
   * Get business team members
   */
  static async getBusinessTeam(businessId: string) {
    const users = await prisma.user.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            assignedOrders: true,
            statusChanges: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    });

    return users.map((user) => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Get users available for order assignment
   */
  static async getAvailableUsers(businessId: string) {
    return await prisma.user.findMany({
      where: {
        businessId,
        isActive: true,
        role: { in: ["MANAGER", "EMPLOYEE"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    });
  }

  /**
   * Get user performance metrics
   */
  static async getUserPerformance(userId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const [orderStats, statusChangeStats] = await Promise.all([
      // Orders assigned and completed
      prisma.order.groupBy({
        by: ["status"],
        where: {
          assignedUserId: userId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      // Status changes made
      prisma.orderStatusHistory.count({
        where: {
          changedBy: userId,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    const ordersByStatus = orderStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const completedOrders =
      (ordersByStatus.COMPLETED || 0) + (ordersByStatus.DELIVERED || 0);
    const totalAssigned = Object.values(ordersByStatus).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      user,
      period: { startDate, endDate: new Date(), days },
      metrics: {
        assignedOrders: totalAssigned,
        completedOrders,
        completionRate:
          totalAssigned > 0
            ? Math.round((completedOrders / totalAssigned) * 100)
            : 0,
        statusChanges: statusChangeStats,
      },
      ordersByStatus,
    };
  }

  /**
   * Update user last login
   */
  static async updateLastLogin(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Get inactive users (haven't logged in recently)
   */
  static async getInactiveUsers(
    businessId?: string,
    daysSinceLogin: number = 30
  ) {
    const cutoffDate = new Date(
      Date.now() - daysSinceLogin * 24 * 60 * 60 * 1000
    );

    const where: any = {
      isActive: true,
      OR: [{ lastLogin: null }, { lastLogin: { lt: cutoffDate } }],
    };

    if (businessId) {
      where.businessId = businessId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        business: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { lastLogin: "desc" },
    });

    return users.map((user) => {
      const { passwordHash, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        daysSinceLastLogin: user.lastLogin
          ? Math.floor(
              (Date.now() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      };
    });
  }

  /**
   * Assign user to business
   */
  static async assignToBusiness(userId: string, businessId: string) {
    const [user, business] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.business.findUnique({ where: { id: businessId } }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if (!business) {
      throw new Error("Business not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        businessId,
        updatedAt: new Date(),
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
          },
        },
      },
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Remove user from business
   */
  static async removeFromBusiness(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        businessId: null,
        updatedAt: new Date(),
      },
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}

// Named export functions for API routes compatibility
export async function getUsers(
  filters: UserFilters,
  limit: number = 50,
  offset: number = 0
) {
  console.log(
    `[DEBUG] getUsers called with filters:`,
    filters,
    `limit: ${limit}, offset: ${offset}`
  );
  return await UserDatabaseService.getUsers(filters, limit, offset);
}

export async function createUser(data: CreateUserData) {
  console.log(`[DEBUG] createUser called with data:`, {
    ...data,
    password: "[REDACTED]",
  });
  return await UserDatabaseService.createUser(data);
}

export async function updateUser(userId: string, data: UpdateUserData) {
  console.log(`[DEBUG] updateUser called with userId: ${userId}, data:`, data);
  return await UserDatabaseService.updateUser(userId, data);
}

export default UserDatabaseService;
