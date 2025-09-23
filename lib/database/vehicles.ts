import { PrismaClient, VehicleStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

export interface VehicleFilters {
  businessId: string;
  status?: VehicleStatus[];
  assignedDriverId?: string;
  isActive?: boolean;
  hasGps?: boolean;
  hasRefrigeration?: boolean;
  canHandleFragile?: boolean;
  search?: string; // Search in plate number, brand, model
  sortBy?: "plateNumber" | "brand" | "status" | "currentKm" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateVehicleData {
  businessId: string;
  plateNumber: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  maxWeightKg: number;
  maxItemCount: number;
  maxVolumeM3?: number;
  assignedDriverId?: string;
  hasGps?: boolean;
  hasRefrigeration?: boolean;
  canHandleFragile?: boolean;
  fuelCostPerKm?: number;
  operatingCostPerHour?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceKm?: number;
  currentKm?: number;
}

export interface UpdateVehicleData {
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  maxWeightKg?: number;
  maxItemCount?: number;
  maxVolumeM3?: number;
  status?: VehicleStatus;
  isActive?: boolean;
  assignedDriverId?: string;
  hasGps?: boolean;
  hasRefrigeration?: boolean;
  canHandleFragile?: boolean;
  fuelCostPerKm?: number;
  operatingCostPerHour?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceKm?: number;
  currentKm?: number;
}

export interface VehicleStats {
  total: number;
  byStatus: Record<string, number>;
  availableCount: number;
  inUseCount: number;
  maintenanceCount: number;
  averageKm: number;
  totalCapacityKg: number;
  totalCapacityItems: number;
}

export class VehicleDatabaseService {
  /**
   * Create a new vehicle
   */
  static async createVehicle(data: CreateVehicleData) {
    // Check if plate number already exists
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        plateNumber: data.plateNumber,
      },
    });

    if (existingVehicle) {
      throw new Error(
        `Vehicle with plate number ${data.plateNumber} already exists`
      );
    }

    // If driver is assigned, validate they are available and have DRIVER role
    if (data.assignedDriverId) {
      const driver = await prisma.user.findFirst({
        where: {
          id: data.assignedDriverId,
          businessId: data.businessId,
          role: "DRIVER",
          isActive: true,
        },
      });

      if (!driver) {
        throw new Error("Assigned driver not found or not available");
      }

      // Check if driver is already assigned to another vehicle
      const existingAssignment = await prisma.vehicle.findFirst({
        where: {
          assignedDriverId: data.assignedDriverId,
          isActive: true,
        },
      });

      if (existingAssignment) {
        throw new Error("Driver is already assigned to another vehicle");
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        businessId: data.businessId,
        plateNumber: data.plateNumber,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        maxWeightKg: data.maxWeightKg,
        maxItemCount: data.maxItemCount,
        maxVolumeM3: data.maxVolumeM3,
        status: "AVAILABLE",
        assignedDriverId: data.assignedDriverId,
        hasGps: data.hasGps ?? true,
        hasRefrigeration: data.hasRefrigeration ?? false,
        canHandleFragile: data.canHandleFragile ?? true,
        fuelCostPerKm: data.fuelCostPerKm,
        operatingCostPerHour: data.operatingCostPerHour,
        lastMaintenanceDate: data.lastMaintenanceDate,
        nextMaintenanceKm: data.nextMaintenanceKm,
        currentKm: data.currentKm ?? 0,
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return vehicle;
  }

  /**
   * Get vehicles with filters and pagination
   */
  static async getVehicles(
    filters: VehicleFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.assignedDriverId) {
      where.assignedDriverId = filters.assignedDriverId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.hasGps !== undefined) {
      where.hasGps = filters.hasGps;
    }

    if (filters.hasRefrigeration !== undefined) {
      where.hasRefrigeration = filters.hasRefrigeration;
    }

    if (filters.canHandleFragile !== undefined) {
      where.canHandleFragile = filters.canHandleFragile;
    }

    if (filters.search) {
      where.OR = [
        { plateNumber: { contains: filters.search } },
        { brand: { contains: filters.search } },
        { model: { contains: filters.search } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "asc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          assignedDriver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          _count: {
            select: {
              routes: true,
              deliveryZones: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { vehicles, total };
  }

  /**
   * Get vehicle by ID
   */
  static async getVehicleById(vehicleId: string, businessId: string) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        businessId,
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryZones: {
          include: {
            deliveryZone: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
              },
            },
          },
        },
        routes: {
          where: {
            status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
          },
          select: {
            id: true,
            routeName: true,
            status: true,
            plannedDate: true,
          },
          orderBy: {
            plannedDate: "asc",
          },
        },
        _count: {
          select: {
            routes: true,
            trackingLogs: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    return vehicle;
  }

  /**
   * Update vehicle
   */
  static async updateVehicle(
    vehicleId: string,
    businessId: string,
    data: UpdateVehicleData
  ) {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, businessId },
    });

    if (!existingVehicle) {
      throw new Error("Vehicle not found");
    }

    // If updating plate number, check for duplicates
    if (data.plateNumber && data.plateNumber !== existingVehicle.plateNumber) {
      const duplicatePlate = await prisma.vehicle.findFirst({
        where: {
          plateNumber: data.plateNumber,
          id: { not: vehicleId },
        },
      });

      if (duplicatePlate) {
        throw new Error(
          `Vehicle with plate number ${data.plateNumber} already exists`
        );
      }
    }

    // If assigning a new driver, validate
    if (
      data.assignedDriverId &&
      data.assignedDriverId !== existingVehicle.assignedDriverId
    ) {
      if (data.assignedDriverId) {
        const driver = await prisma.user.findFirst({
          where: {
            id: data.assignedDriverId,
            businessId,
            role: "DRIVER",
            isActive: true,
          },
        });

        if (!driver) {
          throw new Error("Assigned driver not found or not available");
        }

        // Check if driver is already assigned to another vehicle
        const existingAssignment = await prisma.vehicle.findFirst({
          where: {
            assignedDriverId: data.assignedDriverId,
            isActive: true,
            id: { not: vehicleId },
          },
        });

        if (existingAssignment) {
          throw new Error("Driver is already assigned to another vehicle");
        }
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...(data.plateNumber && { plateNumber: data.plateNumber }),
        ...(data.brand && { brand: data.brand }),
        ...(data.model && { model: data.model }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.maxWeightKg !== undefined && {
          maxWeightKg: data.maxWeightKg,
        }),
        ...(data.maxItemCount !== undefined && {
          maxItemCount: data.maxItemCount,
        }),
        ...(data.maxVolumeM3 !== undefined && {
          maxVolumeM3: data.maxVolumeM3,
        }),
        ...(data.status && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.assignedDriverId !== undefined && {
          assignedDriverId: data.assignedDriverId,
        }),
        ...(data.hasGps !== undefined && { hasGps: data.hasGps }),
        ...(data.hasRefrigeration !== undefined && {
          hasRefrigeration: data.hasRefrigeration,
        }),
        ...(data.canHandleFragile !== undefined && {
          canHandleFragile: data.canHandleFragile,
        }),
        ...(data.fuelCostPerKm !== undefined && {
          fuelCostPerKm: data.fuelCostPerKm,
        }),
        ...(data.operatingCostPerHour !== undefined && {
          operatingCostPerHour: data.operatingCostPerHour,
        }),
        ...(data.lastMaintenanceDate !== undefined && {
          lastMaintenanceDate: data.lastMaintenanceDate,
        }),
        ...(data.nextMaintenanceKm !== undefined && {
          nextMaintenanceKm: data.nextMaintenanceKm,
        }),
        ...(data.currentKm !== undefined && { currentKm: data.currentKm }),
        updatedAt: new Date(),
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return updatedVehicle;
  }

  /**
   * Delete vehicle (soft delete by marking inactive)
   */
  static async deleteVehicle(vehicleId: string, businessId: string) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, businessId },
      include: {
        routes: {
          where: {
            status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
          },
        },
      },
    });

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if vehicle has active routes
    if (vehicle.routes.length > 0) {
      throw new Error(
        "Cannot delete vehicle with active routes. Complete or cancel routes first."
      );
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        isActive: false,
        status: "RETIRED",
        assignedDriverId: null,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Get vehicle statistics
   */
  static async getVehicleStats(businessId: string): Promise<VehicleStats> {
    const [totalVehicles, statusCounts, capacityStats] = await Promise.all([
      // Total active vehicles
      prisma.vehicle.count({
        where: {
          businessId,
          isActive: true,
        },
      }),

      // Vehicles by status
      prisma.vehicle.groupBy({
        by: ["status"],
        where: {
          businessId,
          isActive: true,
        },
        _count: { id: true },
      }),

      // Capacity and km statistics
      prisma.vehicle.aggregate({
        where: {
          businessId,
          isActive: true,
        },
        _sum: {
          maxWeightKg: true,
          maxItemCount: true,
        },
        _avg: {
          currentKm: true,
        },
      }),
    ]);

    // Format status counts
    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalVehicles,
      byStatus,
      availableCount: byStatus["AVAILABLE"] || 0,
      inUseCount: byStatus["IN_USE"] || 0,
      maintenanceCount: byStatus["MAINTENANCE"] || 0,
      averageKm: Math.round(Number(capacityStats._avg?.currentKm || 0)),
      totalCapacityKg: Number(capacityStats._sum?.maxWeightKg || 0),
      totalCapacityItems: capacityStats._sum?.maxItemCount || 0,
    };
  }

  /**
   * Get available vehicles for route assignment
   */
  static async getAvailableVehicles(
    businessId: string,
    excludeVehicleIds?: string[]
  ) {
    const where: any = {
      businessId,
      isActive: true,
      status: "AVAILABLE",
    };

    if (excludeVehicleIds && excludeVehicleIds.length > 0) {
      where.id = { notIn: excludeVehicleIds };
    }

    return await prisma.vehicle.findMany({
      where,
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: [{ plateNumber: "asc" }],
    });
  }

  /**
   * Get vehicles by delivery zone
   */
  static async getVehiclesByDeliveryZone(
    businessId: string,
    deliveryZoneId: string
  ) {
    return await prisma.vehicle.findMany({
      where: {
        businessId,
        isActive: true,
        deliveryZones: {
          some: {
            deliveryZoneId,
            isActive: true,
          },
        },
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Assign delivery zones to vehicle
   */
  static async assignDeliveryZones(
    vehicleId: string,
    businessId: string,
    deliveryZoneIds: string[]
  ) {
    // Verify vehicle exists and belongs to business
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, businessId },
    });

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Verify all delivery zones exist and belong to business
    const deliveryZones = await prisma.deliveryZone.findMany({
      where: {
        id: { in: deliveryZoneIds },
        businessId,
      },
    });

    if (deliveryZones.length !== deliveryZoneIds.length) {
      throw new Error("One or more delivery zones not found");
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing assignments
      await tx.vehicleDeliveryZone.deleteMany({
        where: { vehicleId },
      });

      // Create new assignments
      if (deliveryZoneIds.length > 0) {
        await tx.vehicleDeliveryZone.createMany({
          data: deliveryZoneIds.map((deliveryZoneId) => ({
            vehicleId,
            deliveryZoneId,
            isActive: true,
          })),
        });
      }
    });

    return { success: true };
  }

  /**
   * Get vehicles needing maintenance
   */
  static async getVehiclesNeedingMaintenance(businessId: string) {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          {
            status: "MAINTENANCE",
          },
          {
            AND: [
              { nextMaintenanceKm: { not: null } },
              { currentKm: { gte: prisma.vehicle.fields.nextMaintenanceKm } },
            ],
          },
        ],
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { status: "desc" }, // MAINTENANCE first
        { currentKm: "desc" },
      ],
    });

    return vehicles;
  }
}

// Named export functions for API routes compatibility
export async function getVehicles(
  filters: VehicleFilters,
  limit: number = 50,
  offset: number = 0
) {
  return await VehicleDatabaseService.getVehicles(filters, limit, offset);
}

export async function getVehicleStats(businessId: string) {
  return await VehicleDatabaseService.getVehicleStats(businessId);
}

export default VehicleDatabaseService;
