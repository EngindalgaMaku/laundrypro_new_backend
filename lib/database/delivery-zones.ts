import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DeliveryZoneFilters {
  businessId: string;
  city?: string;
  district?: string;
  isActive?: boolean;
  search?: string; // Search in name, city, district
  sortBy?: "name" | "city" | "district" | "priority" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateDeliveryZoneData {
  businessId: string;
  name: string;
  city: string;
  district: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  priority?: number;
  serviceStartTime?: string;
  serviceEndTime?: string;
  serviceDays?: string;
}

export interface UpdateDeliveryZoneData {
  name?: string;
  city?: string;
  district?: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  isActive?: boolean;
  priority?: number;
  serviceStartTime?: string;
  serviceEndTime?: string;
  serviceDays?: string;
}

export interface DeliveryZoneStats {
  total: number;
  active: number;
  byCity: Record<string, number>;
  coverageArea: number;
  avgVehiclesPerZone: number;
}

export class DeliveryZoneDatabaseService {
  /**
   * Create a new delivery zone
   */
  static async createDeliveryZone(data: CreateDeliveryZoneData) {
    // Check if delivery zone already exists for this city/district
    const existingZone = await prisma.deliveryZone.findFirst({
      where: {
        businessId: data.businessId,
        city: data.city,
        district: data.district,
      },
    });

    if (existingZone) {
      throw new Error(
        `Delivery zone for ${data.city}/${data.district} already exists`
      );
    }

    const deliveryZone = await prisma.deliveryZone.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        city: data.city,
        district: data.district,
        boundaries: data.boundaries,
        centerLat: data.centerLat,
        centerLng: data.centerLng,
        priority: data.priority || 1,
        serviceStartTime: data.serviceStartTime,
        serviceEndTime: data.serviceEndTime,
        serviceDays: data.serviceDays,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                brand: true,
                model: true,
              },
            },
          },
        },
        _count: {
          select: {
            vehicles: true,
            routeStops: true,
          },
        },
      },
    });

    return deliveryZone;
  }

  /**
   * Get delivery zones with filters and pagination
   */
  static async getDeliveryZones(
    filters: DeliveryZoneFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.district) {
      where.district = filters.district;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { city: { contains: filters.search } },
        { district: { contains: filters.search } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "asc";
    } else {
      orderBy.priority = "asc";
    }

    const [deliveryZones, total] = await Promise.all([
      prisma.deliveryZone.findMany({
        where,
        include: {
          vehicles: {
            where: { isActive: true },
            include: {
              vehicle: {
                select: {
                  id: true,
                  plateNumber: true,
                  brand: true,
                  model: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              vehicles: true,
              routeStops: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.deliveryZone.count({ where }),
    ]);

    return { deliveryZones, total };
  }

  /**
   * Get delivery zone by ID
   */
  static async getDeliveryZoneById(deliveryZoneId: string, businessId: string) {
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: {
        id: deliveryZoneId,
        businessId,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicles: {
          where: { isActive: true },
          include: {
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                brand: true,
                model: true,
                status: true,
                maxWeightKg: true,
                maxItemCount: true,
                assignedDriver: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        routeStops: {
          include: {
            route: {
              select: {
                id: true,
                routeName: true,
                status: true,
                plannedDate: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Recent stops
        },
        _count: {
          select: {
            vehicles: true,
            routeStops: true,
          },
        },
      },
    });

    if (!deliveryZone) {
      throw new Error("Delivery zone not found");
    }

    return deliveryZone;
  }

  /**
   * Update delivery zone
   */
  static async updateDeliveryZone(
    deliveryZoneId: string,
    businessId: string,
    data: UpdateDeliveryZoneData
  ) {
    // Check if delivery zone exists
    const existingZone = await prisma.deliveryZone.findFirst({
      where: { id: deliveryZoneId, businessId },
    });

    if (!existingZone) {
      throw new Error("Delivery zone not found");
    }

    // If updating city/district, check for duplicates
    if (data.city || data.district) {
      const city = data.city || existingZone.city;
      const district = data.district || existingZone.district;

      if (city !== existingZone.city || district !== existingZone.district) {
        const duplicateZone = await prisma.deliveryZone.findFirst({
          where: {
            businessId,
            city,
            district,
            id: { not: deliveryZoneId },
          },
        });

        if (duplicateZone) {
          throw new Error(
            `Delivery zone for ${city}/${district} already exists`
          );
        }
      }
    }

    const updatedZone = await prisma.deliveryZone.update({
      where: { id: deliveryZoneId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.city && { city: data.city }),
        ...(data.district && { district: data.district }),
        ...(data.boundaries !== undefined && { boundaries: data.boundaries }),
        ...(data.centerLat !== undefined && { centerLat: data.centerLat }),
        ...(data.centerLng !== undefined && { centerLng: data.centerLng }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.serviceStartTime !== undefined && {
          serviceStartTime: data.serviceStartTime,
        }),
        ...(data.serviceEndTime !== undefined && {
          serviceEndTime: data.serviceEndTime,
        }),
        ...(data.serviceDays !== undefined && {
          serviceDays: data.serviceDays,
        }),
        updatedAt: new Date(),
      },
      include: {
        vehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                brand: true,
                model: true,
              },
            },
          },
        },
        _count: {
          select: {
            vehicles: true,
            routeStops: true,
          },
        },
      },
    });

    return updatedZone;
  }

  /**
   * Delete delivery zone
   */
  static async deleteDeliveryZone(deliveryZoneId: string, businessId: string) {
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: { id: deliveryZoneId, businessId },
      include: {
        vehicles: true,
        routeStops: {
          where: {
            route: {
              status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
            },
          },
        },
      },
    });

    if (!deliveryZone) {
      throw new Error("Delivery zone not found");
    }

    // Check if zone has active route stops
    if (deliveryZone.routeStops.length > 0) {
      throw new Error("Cannot delete delivery zone with active route stops");
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Remove vehicle assignments
      await tx.vehicleDeliveryZone.deleteMany({
        where: { deliveryZoneId },
      });

      // Delete delivery zone
      await tx.deliveryZone.delete({
        where: { id: deliveryZoneId },
      });
    });

    return { success: true };
  }

  /**
   * Get delivery zone statistics
   */
  static async getDeliveryZoneStats(
    businessId: string
  ): Promise<DeliveryZoneStats> {
    const [totalZones, activeZones, zonesByCity, vehicleAssignments] =
      await Promise.all([
        // Total zones
        prisma.deliveryZone.count({
          where: { businessId },
        }),

        // Active zones
        prisma.deliveryZone.count({
          where: {
            businessId,
            isActive: true,
          },
        }),

        // Zones by city
        prisma.deliveryZone.groupBy({
          by: ["city"],
          where: { businessId },
          _count: { id: true },
        }),

        // Vehicle assignments
        prisma.vehicleDeliveryZone.count({
          where: {
            deliveryZone: {
              businessId,
            },
            isActive: true,
          },
        }),
      ]);

    // Format city counts
    const byCity = zonesByCity.reduce((acc, item) => {
      acc[item.city] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const avgVehiclesPerZone =
      activeZones > 0 ? Math.round(vehicleAssignments / activeZones) : 0;

    return {
      total: totalZones,
      active: activeZones,
      byCity,
      coverageArea: activeZones, // Simplified - could calculate actual area if boundaries are provided
      avgVehiclesPerZone,
    };
  }

  /**
   * Get delivery zones by city
   */
  static async getDeliveryZonesByCity(businessId: string, city: string) {
    return await prisma.deliveryZone.findMany({
      where: {
        businessId,
        city,
        isActive: true,
      },
      include: {
        vehicles: {
          where: { isActive: true },
          include: {
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            vehicles: true,
            routeStops: true,
          },
        },
      },
      orderBy: [{ priority: "asc" }, { district: "asc" }],
    });
  }

  /**
   * Assign vehicles to delivery zone
   */
  static async assignVehicles(
    deliveryZoneId: string,
    businessId: string,
    vehicleIds: string[]
  ) {
    // Verify delivery zone exists and belongs to business
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: { id: deliveryZoneId, businessId },
    });

    if (!deliveryZone) {
      throw new Error("Delivery zone not found");
    }

    // Verify all vehicles exist and belong to business
    const vehicles = await prisma.vehicle.findMany({
      where: {
        id: { in: vehicleIds },
        businessId,
        isActive: true,
      },
    });

    if (vehicles.length !== vehicleIds.length) {
      throw new Error("One or more vehicles not found or not active");
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing assignments for this zone
      await tx.vehicleDeliveryZone.deleteMany({
        where: { deliveryZoneId },
      });

      // Create new assignments
      if (vehicleIds.length > 0) {
        await tx.vehicleDeliveryZone.createMany({
          data: vehicleIds.map((vehicleId) => ({
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
   * Get available delivery zones (not fully assigned)
   */
  static async getAvailableDeliveryZones(businessId: string) {
    return await prisma.deliveryZone.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        vehicles: {
          where: { isActive: true },
          select: {
            vehicleId: true,
          },
        },
        _count: {
          select: {
            vehicles: true,
          },
        },
      },
      orderBy: [{ priority: "asc" }, { city: "asc" }, { district: "asc" }],
    });
  }

  /**
   * Get cities with delivery zones
   */
  static async getCitiesWithZones(businessId: string) {
    const cities = await prisma.deliveryZone.groupBy({
      by: ["city"],
      where: {
        businessId,
        isActive: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        city: "asc",
      },
    });

    return cities.map((city) => ({
      city: city.city,
      zoneCount: city._count.id,
    }));
  }

  /**
   * Search delivery zones by location
   */
  static async searchByLocation(
    businessId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) {
    // This is a simplified search - in production, you'd want to use proper
    // geospatial queries with PostGIS or similar
    return await prisma.deliveryZone.findMany({
      where: {
        businessId,
        isActive: true,
        centerLat: { not: null },
        centerLng: { not: null },
      },
      include: {
        vehicles: {
          where: { isActive: true },
          select: {
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        priority: "asc",
      },
    });
  }
}

// Named export functions for API routes compatibility
export async function getDeliveryZones(
  filters: DeliveryZoneFilters,
  limit: number = 50,
  offset: number = 0
) {
  return await DeliveryZoneDatabaseService.getDeliveryZones(
    filters,
    limit,
    offset
  );
}

export async function getDeliveryZoneStats(businessId: string) {
  return await DeliveryZoneDatabaseService.getDeliveryZoneStats(businessId);
}

export default DeliveryZoneDatabaseService;
