import {
  PrismaClient,
  RouteStatus,
  RouteType,
  StopStatus,
  StopType,
} from "@prisma/client";

const prisma = new PrismaClient();

export interface RouteFilters {
  businessId: string;
  vehicleId?: string;
  status?: RouteStatus[];
  routeType?: RouteType[];
  plannedDateRange?: {
    startDate: Date;
    endDate: Date;
  };
  search?: string; // Search in route name
  sortBy?:
    | "routeName"
    | "plannedDate"
    | "status"
    | "totalDistance"
    | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateRouteData {
  businessId: string;
  vehicleId: string;
  routeName: string;
  routeType?: RouteType;
  plannedDate: Date;
  plannedStartTime: Date;
  plannedEndTime?: Date;
  optimizedFor?: string;
  notes?: string;
  driverInstructions?: string;
}

export interface UpdateRouteData {
  routeName?: string;
  status?: RouteStatus;
  vehicleId?: string;
  plannedDate?: Date;
  plannedStartTime?: Date;
  plannedEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  totalDistance?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  totalWeight?: number;
  totalItems?: number;
  optimizedFor?: string;
  optimizationScore?: number;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  driverInstructions?: string;
}

export interface CreateRouteStopData {
  routeId: string;
  deliveryZoneId?: string;
  stopType: StopType;
  sequence: number;
  address: string;
  latitude?: number;
  longitude?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  plannedArrival?: Date;
  plannedDeparture?: Date;
  serviceTime?: number;
  itemCount?: number;
  weight?: number;
  specialInstructions?: string;
}

export interface UpdateRouteStopData {
  sequence?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: StopStatus;
  estimatedArrival?: Date;
  actualArrival?: Date;
  actualDeparture?: Date;
  serviceTime?: number;
  waitingTime?: number;
  itemCount?: number;
  weight?: number;
  specialInstructions?: string;
  completionNotes?: string;
  photoUrl?: string;
  signatureUrl?: string;
  failureReason?: string;
}

export interface RouteStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalDistance: number;
  averageDistance: number;
  completedRoutes: number;
  onTimePerformance: number;
  avgStopsPerRoute: number;
}

export class RouteDatabaseService {
  /**
   * Create a new route
   */
  static async createRoute(data: CreateRouteData) {
    // Validate vehicle exists and belongs to business
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: data.vehicleId,
        businessId: data.businessId,
        isActive: true,
      },
    });

    if (!vehicle) {
      throw new Error("Vehicle not found or not available");
    }

    // Check if vehicle is available for the planned time
    const conflictingRoutes = await prisma.route.findMany({
      where: {
        vehicleId: data.vehicleId,
        plannedDate: data.plannedDate,
        status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
      },
    });

    if (conflictingRoutes.length > 0) {
      throw new Error(
        "Vehicle is already assigned to another route on this date"
      );
    }

    const route = await prisma.route.create({
      data: {
        businessId: data.businessId,
        vehicleId: data.vehicleId,
        routeName: data.routeName,
        routeType: data.routeType || "MIXED",
        status: "PLANNED",
        plannedDate: data.plannedDate,
        plannedStartTime: data.plannedStartTime,
        plannedEndTime: data.plannedEndTime,
        optimizedFor: data.optimizedFor || "distance",
        notes: data.notes,
        driverInstructions: data.driverInstructions,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
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
        stops: {
          orderBy: { sequence: "asc" },
        },
        _count: {
          select: {
            stops: true,
          },
        },
      },
    });

    return route;
  }

  /**
   * Get routes with filters and pagination
   */
  static async getRoutes(
    filters: RouteFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.routeType && filters.routeType.length > 0) {
      where.routeType = { in: filters.routeType };
    }

    if (filters.plannedDateRange) {
      where.plannedDate = {
        gte: filters.plannedDateRange.startDate,
        lte: filters.plannedDateRange.endDate,
      };
    }

    if (filters.search) {
      where.OR = [
        { routeName: { contains: filters.search } },
        { notes: { contains: filters.search } },
        {
          vehicle: {
            plateNumber: { contains: filters.search },
          },
        },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "desc";
    } else {
      orderBy.plannedDate = "desc";
    }

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              brand: true,
              model: true,
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
          stops: {
            select: {
              id: true,
              sequence: true,
              stopType: true,
              status: true,
              address: true,
              customerName: true,
              latitude: true,
              longitude: true,
            },
            orderBy: { sequence: "asc" },
          },
          _count: {
            select: {
              stops: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.route.count({ where }),
    ]);

    return { routes, total };
  }

  /**
   * Get route by ID
   */
  static async getRouteById(routeId: string, businessId: string) {
    const route = await prisma.route.findFirst({
      where: {
        id: routeId,
        businessId,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
            maxWeightKg: true,
            maxItemCount: true,
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
        },
        stops: {
          include: {
            deliveryZone: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                address: true,
              },
            },
            orders: {
              include: {
                order: {
                  select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    totalAmount: true,
                  },
                },
              },
            },
          },
          orderBy: { sequence: "asc" },
        },
        assignments: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            stops: true,
            assignments: true,
          },
        },
      },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    return route;
  }

  /**
   * Update route
   */
  static async updateRoute(
    routeId: string,
    businessId: string,
    data: UpdateRouteData
  ) {
    // Check if route exists
    const existingRoute = await prisma.route.findFirst({
      where: { id: routeId, businessId },
    });

    if (!existingRoute) {
      throw new Error("Route not found");
    }

    // If changing vehicle, validate availability
    if (data.vehicleId && data.vehicleId !== existingRoute.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          businessId,
          isActive: true,
        },
      });

      if (!vehicle) {
        throw new Error("Vehicle not found or not available");
      }

      // Check vehicle availability for the date
      const plannedDate = data.plannedDate || existingRoute.plannedDate;
      const conflictingRoutes = await prisma.route.findMany({
        where: {
          vehicleId: data.vehicleId,
          plannedDate,
          status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
          id: { not: routeId },
        },
      });

      if (conflictingRoutes.length > 0) {
        throw new Error(
          "Vehicle is already assigned to another route on this date"
        );
      }
    }

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: {
        ...(data.routeName && { routeName: data.routeName }),
        ...(data.status && { status: data.status }),
        ...(data.vehicleId && { vehicleId: data.vehicleId }),
        ...(data.plannedDate && { plannedDate: data.plannedDate }),
        ...(data.plannedStartTime && {
          plannedStartTime: data.plannedStartTime,
        }),
        ...(data.plannedEndTime !== undefined && {
          plannedEndTime: data.plannedEndTime,
        }),
        ...(data.actualStartTime !== undefined && {
          actualStartTime: data.actualStartTime,
        }),
        ...(data.actualEndTime !== undefined && {
          actualEndTime: data.actualEndTime,
        }),
        ...(data.totalDistance !== undefined && {
          totalDistance: data.totalDistance,
        }),
        ...(data.estimatedDuration !== undefined && {
          estimatedDuration: data.estimatedDuration,
        }),
        ...(data.actualDuration !== undefined && {
          actualDuration: data.actualDuration,
        }),
        ...(data.totalWeight !== undefined && {
          totalWeight: data.totalWeight,
        }),
        ...(data.totalItems !== undefined && { totalItems: data.totalItems }),
        ...(data.optimizedFor && { optimizedFor: data.optimizedFor }),
        ...(data.optimizationScore !== undefined && {
          optimizationScore: data.optimizationScore,
        }),
        ...(data.estimatedCost !== undefined && {
          estimatedCost: data.estimatedCost,
        }),
        ...(data.actualCost !== undefined && { actualCost: data.actualCost }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.driverInstructions !== undefined && {
          driverInstructions: data.driverInstructions,
        }),
        updatedAt: new Date(),
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
          },
        },
        stops: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    return updatedRoute;
  }

  /**
   * Delete route
   */
  static async deleteRoute(routeId: string, businessId: string) {
    const route = await prisma.route.findFirst({
      where: { id: routeId, businessId },
      include: {
        stops: true,
      },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    if (route.status === "IN_PROGRESS") {
      throw new Error("Cannot delete route that is in progress");
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete route stop orders
      await tx.routeStopOrder.deleteMany({
        where: {
          routeStop: {
            routeId,
          },
        },
      });

      // Delete route stops
      await tx.routeStop.deleteMany({
        where: { routeId },
      });

      // Delete route assignments
      await tx.routeAssignment.deleteMany({
        where: { routeId },
      });

      // Delete route
      await tx.route.delete({
        where: { id: routeId },
      });
    });

    return { success: true };
  }

  /**
   * Add stop to route
   */
  static async addStopToRoute(data: CreateRouteStopData) {
    // Validate route exists
    const route = await prisma.route.findUnique({
      where: { id: data.routeId },
      include: { stops: true },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    if (route.status === "COMPLETED" || route.status === "CANCELLED") {
      throw new Error("Cannot modify completed or cancelled route");
    }

    // If sequence not provided, add to end
    const sequence =
      data.sequence || Math.max(0, ...route.stops.map((s) => s.sequence)) + 1;

    const stop = await prisma.routeStop.create({
      data: {
        routeId: data.routeId,
        deliveryZoneId: data.deliveryZoneId,
        stopType: data.stopType,
        sequence,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        plannedArrival: data.plannedArrival,
        plannedDeparture: data.plannedDeparture,
        serviceTime: data.serviceTime,
        itemCount: data.itemCount || 0,
        weight: data.weight || 0,
        specialInstructions: data.specialInstructions,
      },
    });

    return stop;
  }

  /**
   * Update route stop
   */
  static async updateRouteStop(
    stopId: string,
    businessId: string,
    data: UpdateRouteStopData
  ) {
    // Validate stop exists and belongs to business
    const existingStop = await prisma.routeStop.findFirst({
      where: {
        id: stopId,
        route: {
          businessId,
        },
      },
    });

    if (!existingStop) {
      throw new Error("Route stop not found");
    }

    const updatedStop = await prisma.routeStop.update({
      where: { id: stopId },
      data: {
        ...(data.sequence !== undefined && { sequence: data.sequence }),
        ...(data.address && { address: data.address }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.status && { status: data.status }),
        ...(data.estimatedArrival !== undefined && {
          estimatedArrival: data.estimatedArrival,
        }),
        ...(data.actualArrival !== undefined && {
          actualArrival: data.actualArrival,
        }),
        ...(data.actualDeparture !== undefined && {
          actualDeparture: data.actualDeparture,
        }),
        ...(data.serviceTime !== undefined && {
          serviceTime: data.serviceTime,
        }),
        ...(data.waitingTime !== undefined && {
          waitingTime: data.waitingTime,
        }),
        ...(data.itemCount !== undefined && { itemCount: data.itemCount }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.specialInstructions !== undefined && {
          specialInstructions: data.specialInstructions,
        }),
        ...(data.completionNotes !== undefined && {
          completionNotes: data.completionNotes,
        }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.signatureUrl !== undefined && {
          signatureUrl: data.signatureUrl,
        }),
        ...(data.failureReason !== undefined && {
          failureReason: data.failureReason,
        }),
        updatedAt: new Date(),
      },
    });

    return updatedStop;
  }

  /**
   * Remove stop from route
   */
  static async removeStopFromRoute(stopId: string, businessId: string) {
    const stop = await prisma.routeStop.findFirst({
      where: {
        id: stopId,
        route: {
          businessId,
        },
      },
      include: {
        route: true,
        orders: true,
      },
    });

    if (!stop) {
      throw new Error("Route stop not found");
    }

    if (stop.route.status === "IN_PROGRESS" && stop.status === "COMPLETED") {
      throw new Error("Cannot remove completed stop from active route");
    }

    await prisma.$transaction(async (tx) => {
      // Remove stop-order relationships
      await tx.routeStopOrder.deleteMany({
        where: { routeStopId: stopId },
      });

      // Remove stop
      await tx.routeStop.delete({
        where: { id: stopId },
      });
    });

    return { success: true };
  }

  /**
   * Get route statistics
   */
  static async getRouteStats(
    businessId: string,
    days: number = 30
  ): Promise<RouteStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalRoutes,
      statusCounts,
      typeCounts,
      routeMetrics,
      completedRoutes,
      stopCounts,
    ] = await Promise.all([
      // Total routes
      prisma.route.count({
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
      }),

      // Routes by status
      prisma.route.groupBy({
        by: ["status"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      // Routes by type
      prisma.route.groupBy({
        by: ["routeType"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      // Route metrics
      prisma.route.aggregate({
        where: {
          businessId,
          createdAt: { gte: startDate },
          totalDistance: { not: null },
        },
        _sum: {
          totalDistance: true,
        },
        _avg: {
          totalDistance: true,
        },
      }),

      // Completed routes for on-time performance
      prisma.route.findMany({
        where: {
          businessId,
          status: "COMPLETED",
          createdAt: { gte: startDate },
          plannedEndTime: { not: null },
          actualEndTime: { not: null },
        },
        select: {
          plannedEndTime: true,
          actualEndTime: true,
        },
      }),

      // Average stops per route
      prisma.route.findMany({
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        include: {
          _count: {
            select: {
              stops: true,
            },
          },
        },
      }),
    ]);

    // Calculate on-time performance
    let onTimeRoutes = 0;
    completedRoutes.forEach((route) => {
      if (route.actualEndTime && route.plannedEndTime) {
        if (route.actualEndTime <= route.plannedEndTime) {
          onTimeRoutes++;
        }
      }
    });

    const onTimePerformance =
      completedRoutes.length > 0
        ? Math.round((onTimeRoutes / completedRoutes.length) * 100)
        : 0;

    // Calculate average stops per route
    const avgStopsPerRoute =
      stopCounts.length > 0
        ? Math.round(
            stopCounts.reduce((sum, route) => sum + route._count.stops, 0) /
              stopCounts.length
          )
        : 0;

    // Format status counts
    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Format type counts
    const byType = typeCounts.reduce((acc, item) => {
      acc[item.routeType] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalRoutes,
      byStatus,
      byType,
      totalDistance: Number(routeMetrics._sum?.totalDistance || 0),
      averageDistance: Number(routeMetrics._avg?.totalDistance || 0),
      completedRoutes: byStatus["COMPLETED"] || 0,
      onTimePerformance,
      avgStopsPerRoute,
    };
  }

  /**
   * Get routes for vehicle
   */
  static async getRoutesForVehicle(
    vehicleId: string,
    businessId: string,
    activeOnly: boolean = false
  ) {
    const where: any = {
      vehicleId,
      businessId,
    };

    if (activeOnly) {
      where.status = { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] };
    }

    return await prisma.route.findMany({
      where,
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
        _count: {
          select: {
            stops: true,
          },
        },
      },
      orderBy: { plannedDate: "desc" },
    });
  }

  /**
   * Get today's routes
   */
  static async getTodaysRoutes(businessId: string) {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    return await prisma.route.findMany({
      where: {
        businessId,
        plannedDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
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
        stops: {
          orderBy: { sequence: "asc" },
          take: 5, // First 5 stops
        },
        _count: {
          select: {
            stops: true,
          },
        },
      },
      orderBy: { plannedStartTime: "asc" },
    });
  }
}

// Named export functions for API routes compatibility
export async function getRoutes(
  filters: RouteFilters,
  limit: number = 50,
  offset: number = 0
) {
  return await RouteDatabaseService.getRoutes(filters, limit, offset);
}

export async function getRouteStats(businessId: string, days: number = 30) {
  return await RouteDatabaseService.getRouteStats(businessId, days);
}

export default RouteDatabaseService;
