import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface RouteAssignmentFilters {
  businessId: string;
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
  status?: string[];
  assignedDateRange?: {
    startDate: Date;
    endDate: Date;
  };
  sortBy?: "assignedAt" | "status" | "completedAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateRouteAssignmentData {
  routeId: string;
  vehicleId: string;
  driverId: string;
  assignedBy: string;
  notes?: string;
}

export interface UpdateRouteAssignmentData {
  status?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface RouteAssignmentStats {
  total: number;
  byStatus: Record<string, number>;
  averageCompletionTime: number;
  onTimeCompletionRate: number;
  pendingAssignments: number;
}

export class RouteAssignmentDatabaseService {
  /**
   * Create a new route assignment
   */
  static async createRouteAssignment(data: CreateRouteAssignmentData) {
    // Validate route exists and belongs to business
    const route = await prisma.route.findFirst({
      where: {
        id: data.routeId,
      },
      include: {
        business: true,
        vehicle: true,
      },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    // Validate vehicle matches route vehicle
    if (route.vehicleId !== data.vehicleId) {
      throw new Error("Vehicle does not match route vehicle");
    }

    // Validate driver exists and belongs to business
    const driver = await prisma.user.findFirst({
      where: {
        id: data.driverId,
        businessId: route.businessId,
        role: "DRIVER",
        isActive: true,
      },
    });

    if (!driver) {
      throw new Error("Driver not found or not available");
    }

    // Validate assigner exists and belongs to business
    const assigner = await prisma.user.findFirst({
      where: {
        id: data.assignedBy,
        businessId: route.businessId,
        isActive: true,
      },
    });

    if (!assigner) {
      throw new Error("Assigner not found");
    }

    // Check if route already has an active assignment
    const existingAssignment = await prisma.routeAssignment.findFirst({
      where: {
        routeId: data.routeId,
        status: { in: ["assigned", "accepted"] },
      },
    });

    if (existingAssignment) {
      throw new Error("Route already has an active assignment");
    }

    // Check if driver has conflicting assignments for the same date
    const conflictingAssignments = await prisma.routeAssignment.findMany({
      where: {
        driverId: data.driverId,
        status: { in: ["assigned", "accepted"] },
        route: {
          plannedDate: route.plannedDate,
        },
      },
    });

    if (conflictingAssignments.length > 0) {
      throw new Error("Driver already has an assignment for this date");
    }

    const assignment = await prisma.routeAssignment.create({
      data: {
        routeId: data.routeId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        assignedBy: data.assignedBy,
        status: "assigned",
        notes: data.notes,
      },
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
            plannedDate: true,
            plannedStartTime: true,
            status: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update route status to ASSIGNED
    await prisma.route.update({
      where: { id: data.routeId },
      data: { status: "ASSIGNED" },
    });

    return assignment;
  }

  /**
   * Get route assignments with filters and pagination
   */
  static async getRouteAssignments(
    filters: RouteAssignmentFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      route: {
        businessId: filters.businessId,
      },
    };

    if (filters.routeId) {
      where.routeId = filters.routeId;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.driverId) {
      where.driverId = filters.driverId;
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.assignedDateRange) {
      where.assignedAt = {
        gte: filters.assignedDateRange.startDate,
        lte: filters.assignedDateRange.endDate,
      };
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "desc";
    } else {
      orderBy.assignedAt = "desc";
    }

    const [assignments, total] = await Promise.all([
      prisma.routeAssignment.findMany({
        where,
        include: {
          route: {
            select: {
              id: true,
              routeName: true,
              routeType: true,
              status: true,
              plannedDate: true,
              plannedStartTime: true,
              plannedEndTime: true,
              actualStartTime: true,
              actualEndTime: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              brand: true,
              model: true,
              status: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.routeAssignment.count({ where }),
    ]);

    return { assignments, total };
  }

  /**
   * Get route assignment by ID
   */
  static async getRouteAssignmentById(
    assignmentId: string,
    businessId: string
  ) {
    const assignment = await prisma.routeAssignment.findFirst({
      where: {
        id: assignmentId,
        route: {
          businessId,
        },
      },
      include: {
        route: {
          include: {
            stops: {
              orderBy: { sequence: "asc" },
              select: {
                id: true,
                sequence: true,
                stopType: true,
                status: true,
                address: true,
                customerName: true,
                itemCount: true,
                weight: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
            status: true,
            maxWeightKg: true,
            maxItemCount: true,
            hasGps: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new Error("Route assignment not found");
    }

    return assignment;
  }

  /**
   * Update route assignment
   */
  static async updateRouteAssignment(
    assignmentId: string,
    businessId: string,
    data: UpdateRouteAssignmentData
  ) {
    // Check if assignment exists
    const existingAssignment = await prisma.routeAssignment.findFirst({
      where: {
        id: assignmentId,
        route: {
          businessId,
        },
      },
      include: {
        route: true,
      },
    });

    if (!existingAssignment) {
      throw new Error("Route assignment not found");
    }

    const updatedAssignment = await prisma.routeAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.acceptedAt !== undefined && { acceptedAt: data.acceptedAt }),
        ...(data.completedAt !== undefined && {
          completedAt: data.completedAt,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
            status: true,
            plannedDate: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Update route status based on assignment status
    if (data.status) {
      let routeStatus = existingAssignment.route.status;

      switch (data.status) {
        case "accepted":
          routeStatus = "ASSIGNED";
          break;
        case "completed":
          routeStatus = "COMPLETED";
          break;
        case "rejected":
          routeStatus = "PLANNED";
          break;
      }

      if (routeStatus !== existingAssignment.route.status) {
        await prisma.route.update({
          where: { id: existingAssignment.routeId },
          data: { status: routeStatus },
        });
      }
    }

    return updatedAssignment;
  }

  /**
   * Delete route assignment
   */
  static async deleteRouteAssignment(assignmentId: string, businessId: string) {
    const assignment = await prisma.routeAssignment.findFirst({
      where: {
        id: assignmentId,
        route: {
          businessId,
        },
      },
      include: {
        route: true,
      },
    });

    if (!assignment) {
      throw new Error("Route assignment not found");
    }

    if (
      assignment.status === "accepted" &&
      assignment.route.status === "IN_PROGRESS"
    ) {
      throw new Error("Cannot delete assignment for route in progress");
    }

    await prisma.$transaction(async (tx) => {
      // Delete assignment
      await tx.routeAssignment.delete({
        where: { id: assignmentId },
      });

      // Update route status back to PLANNED if it was ASSIGNED
      if (assignment.route.status === "ASSIGNED") {
        await tx.route.update({
          where: { id: assignment.routeId },
          data: { status: "PLANNED" },
        });
      }
    });

    return { success: true };
  }

  /**
   * Accept route assignment
   */
  static async acceptAssignment(
    assignmentId: string,
    driverId: string,
    businessId: string
  ) {
    const assignment = await prisma.routeAssignment.findFirst({
      where: {
        id: assignmentId,
        driverId,
        route: {
          businessId,
        },
      },
    });

    if (!assignment) {
      throw new Error(
        "Route assignment not found or not assigned to this driver"
      );
    }

    if (assignment.status !== "assigned") {
      throw new Error("Assignment cannot be accepted in current status");
    }

    return await this.updateRouteAssignment(assignmentId, businessId, {
      status: "accepted",
      acceptedAt: new Date(),
    });
  }

  /**
   * Reject route assignment
   */
  static async rejectAssignment(
    assignmentId: string,
    driverId: string,
    businessId: string
  ) {
    const assignment = await prisma.routeAssignment.findFirst({
      where: {
        id: assignmentId,
        driverId,
        route: {
          businessId,
        },
      },
    });

    if (!assignment) {
      throw new Error(
        "Route assignment not found or not assigned to this driver"
      );
    }

    if (assignment.status !== "assigned") {
      throw new Error("Assignment cannot be rejected in current status");
    }

    return await this.updateRouteAssignment(assignmentId, businessId, {
      status: "rejected",
    });
  }

  /**
   * Complete route assignment
   */
  static async completeAssignment(assignmentId: string, businessId: string) {
    const assignment = await prisma.routeAssignment.findFirst({
      where: {
        id: assignmentId,
        route: {
          businessId,
        },
      },
    });

    if (!assignment) {
      throw new Error("Route assignment not found");
    }

    if (assignment.status !== "accepted") {
      throw new Error("Assignment must be accepted before completion");
    }

    return await this.updateRouteAssignment(assignmentId, businessId, {
      status: "completed",
      completedAt: new Date(),
    });
  }

  /**
   * Get route assignment statistics
   */
  static async getRouteAssignmentStats(
    businessId: string,
    days: number = 30
  ): Promise<RouteAssignmentStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalAssignments, statusCounts, completedAssignments] =
      await Promise.all([
        // Total assignments
        prisma.routeAssignment.count({
          where: {
            route: { businessId },
            assignedAt: { gte: startDate },
          },
        }),

        // Assignments by status
        prisma.routeAssignment.groupBy({
          by: ["status"],
          where: {
            route: { businessId },
            assignedAt: { gte: startDate },
          },
          _count: { id: true },
        }),

        // Completed assignments for metrics
        prisma.routeAssignment.findMany({
          where: {
            route: { businessId },
            status: "completed",
            assignedAt: { gte: startDate },
            completedAt: { not: null },
          },
          include: {
            route: {
              select: {
                plannedEndTime: true,
                actualEndTime: true,
              },
            },
          },
        }),
      ]);

    // Calculate completion metrics
    let totalCompletionTime = 0;
    let onTimeCompletions = 0;

    completedAssignments.forEach((assignment) => {
      if (assignment.assignedAt && assignment.completedAt) {
        const completionTime =
          assignment.completedAt.getTime() - assignment.assignedAt.getTime();
        totalCompletionTime += completionTime;

        // Check if completed on time (route finished before or at planned end time)
        if (assignment.route.actualEndTime && assignment.route.plannedEndTime) {
          if (
            assignment.route.actualEndTime <= assignment.route.plannedEndTime
          ) {
            onTimeCompletions++;
          }
        }
      }
    });

    const averageCompletionTime =
      completedAssignments.length > 0
        ? Math.round(
            totalCompletionTime / completedAssignments.length / (1000 * 60 * 60)
          ) // hours
        : 0;

    const onTimeCompletionRate =
      completedAssignments.length > 0
        ? Math.round((onTimeCompletions / completedAssignments.length) * 100)
        : 0;

    // Format status counts
    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalAssignments,
      byStatus,
      averageCompletionTime,
      onTimeCompletionRate,
      pendingAssignments: byStatus["assigned"] || 0,
    };
  }

  /**
   * Get assignments for driver
   */
  static async getAssignmentsForDriver(
    driverId: string,
    businessId: string,
    activeOnly: boolean = false
  ) {
    const where: any = {
      driverId,
      route: {
        businessId,
      },
    };

    if (activeOnly) {
      where.status = { in: ["assigned", "accepted"] };
    }

    return await prisma.routeAssignment.findMany({
      where,
      include: {
        route: {
          include: {
            stops: {
              orderBy: { sequence: "asc" },
              select: {
                id: true,
                sequence: true,
                stopType: true,
                status: true,
                address: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });
  }

  /**
   * Get assignments for vehicle
   */
  static async getAssignmentsForVehicle(vehicleId: string, businessId: string) {
    return await prisma.routeAssignment.findMany({
      where: {
        vehicleId,
        route: {
          businessId,
        },
      },
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
            status: true,
            plannedDate: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });
  }

  /**
   * Get pending assignments
   */
  static async getPendingAssignments(businessId: string) {
    return await prisma.routeAssignment.findMany({
      where: {
        status: "assigned",
        route: {
          businessId,
        },
      },
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
            plannedDate: true,
            plannedStartTime: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: [{ route: { plannedDate: "asc" } }, { assignedAt: "asc" }],
    });
  }
}

// Named export functions for API routes compatibility
export async function getRouteAssignments(
  filters: RouteAssignmentFilters,
  limit: number = 50,
  offset: number = 0
) {
  return await RouteAssignmentDatabaseService.getRouteAssignments(
    filters,
    limit,
    offset
  );
}

export async function getRouteAssignmentStats(
  businessId: string,
  days: number = 30
) {
  return await RouteAssignmentDatabaseService.getRouteAssignmentStats(
    businessId,
    days
  );
}

export default RouteAssignmentDatabaseService;
