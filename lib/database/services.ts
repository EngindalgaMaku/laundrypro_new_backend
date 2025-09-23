import { PrismaClient, ServiceCategory, PricingType } from "@prisma/client";

const prisma = new PrismaClient();

export interface ServiceFilters {
  businessId: string;
  category?: ServiceCategory[];
  isActive?: boolean;
  search?: string; // Search in name, description
  hasActivePricing?: boolean;
  sortBy?: "createdAt" | "name" | "category";
  sortOrder?: "asc" | "desc";
}

export interface CreateServiceData {
  businessId: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  isActive?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  isActive?: boolean;
}

export interface CreateServicePricingData {
  serviceId: string;
  businessId: string;
  name: string; // e.g., "Small Size", "Medium Size", "Large Size"
  description?: string;
  pricingType: PricingType;
  basePrice: number;
  minQuantity?: number;
  maxQuantity?: number;
  unit?: string; // "piece", "kg", "m2", "hour"
  isActive?: boolean;
}

export interface UpdateServicePricingData {
  name?: string;
  description?: string;
  pricingType?: PricingType;
  basePrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  unit?: string;
  isActive?: boolean;
}

export interface ServiceStats {
  totalServices: number;
  activeServices: number;
  byCategory: Record<string, number>;
  popularServices: Array<{
    id: string;
    name: string;
    category: ServiceCategory;
    orderCount: number;
    revenue: number;
  }>;
  averagePrice: number;
  pricingDistribution: Record<string, number>;
}

export interface ServiceWithPricing {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  pricings: Array<{
    id: string;
    serviceId: string;
    businessId: string;
    name: string;
    description: string | null;
    pricingType: PricingType;
    basePrice: any; // Prisma Decimal type
    minQuantity: number | null;
    maxQuantity: number | null;
    unit: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  _count: {
    pricings: number;
    orderItems: number;
  };
}

export class ServiceDatabaseService {
  /**
   * Create a new service
   */
  static async createService(data: CreateServiceData) {
    // Check if service with same name already exists
    const existingService = await prisma.service.findFirst({
      where: {
        businessId: data.businessId,
        name: data.name,
      },
    });

    if (existingService) {
      throw new Error("Service with this name already exists");
    }

    const service = await prisma.service.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        description: data.description,
        category: data.category,
        isActive: data.isActive ?? true,
      },
      include: {
        pricings: true,
        _count: {
          select: {
            pricings: true,
            orderItems: true,
          },
        },
      },
    });

    return service;
  }

  /**
   * Get services with filters and pagination
   */
  static async getServices(
    filters: ServiceFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ services: ServiceWithPricing[]; total: number }> {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.category && filters.category.length > 0) {
      where.category = { in: filters.category };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    if (filters.hasActivePricing !== undefined) {
      if (filters.hasActivePricing) {
        where.pricings = { some: { isActive: true } };
      } else {
        where.pricings = { none: { isActive: true } };
      }
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "asc";
    } else {
      orderBy.name = "asc";
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          pricings: {
            orderBy: { basePrice: "asc" },
          },
          _count: {
            select: {
              pricings: true,
              orderItems: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.service.count({ where }),
    ]);

    return { services: services as any as ServiceWithPricing[], total };
  }

  /**
   * Get service by ID with all details
   */
  static async getServiceById(serviceId: string, businessId: string) {
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId,
      },
      include: {
        pricings: {
          orderBy: { basePrice: "asc" },
        },
        orderItems: {
          include: {
            order: {
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
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10, // Last 10 orders
        },
        _count: {
          select: {
            pricings: true,
            orderItems: true,
          },
        },
      },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    // Calculate revenue from completed orders
    const revenueStats = await prisma.orderItem.aggregate({
      where: {
        serviceId,
        order: {
          businessId,
          status: { in: ["COMPLETED", "DELIVERED"] },
        },
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      ...service,
      stats: {
        totalRevenue: Number(revenueStats._sum.totalPrice || 0),
        completedOrders: revenueStats._count.id,
      },
    };
  }

  /**
   * Update service
   */
  static async updateService(
    serviceId: string,
    businessId: string,
    data: UpdateServiceData
  ) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    // Check if name is being changed and already exists
    if (data.name && data.name !== service.name) {
      const existingService = await prisma.service.findFirst({
        where: {
          businessId,
          name: data.name,
          id: { not: serviceId },
        },
      });

      if (existingService) {
        throw new Error("Service with this name already exists");
      }
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        pricings: {
          orderBy: { basePrice: "asc" },
        },
        _count: {
          select: {
            pricings: true,
            orderItems: true,
          },
        },
      },
    });

    return updatedService;
  }

  /**
   * Delete service
   */
  static async deleteService(serviceId: string, businessId: string) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
      include: {
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    if (service._count.orderItems > 0) {
      // Soft delete - mark as inactive
      await prisma.service.update({
        where: { id: serviceId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
      return { success: true, softDeleted: true };
    } else {
      // Hard delete if no order items
      await prisma.service.delete({
        where: { id: serviceId },
      });
      return { success: true, softDeleted: false };
    }
  }

  /**
   * Create service pricing
   */
  static async createServicePricing(data: CreateServicePricingData) {
    // Verify service exists and belongs to business
    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        businessId: data.businessId,
      },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    // Check if pricing with same name already exists for this service
    const existingPricing = await prisma.servicePricing.findFirst({
      where: {
        serviceId: data.serviceId,
        name: data.name,
      },
    });

    if (existingPricing) {
      throw new Error("Pricing with this name already exists for this service");
    }

    const pricing = await prisma.servicePricing.create({
      data: {
        serviceId: data.serviceId,
        businessId: data.businessId,
        name: data.name,
        description: data.description,
        pricingType: data.pricingType,
        basePrice: data.basePrice,
        minQuantity: data.minQuantity ?? 1,
        maxQuantity: data.maxQuantity,
        unit: data.unit,
        isActive: data.isActive ?? true,
      },
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    return pricing;
  }

  /**
   * Get service pricings
   */
  static async getServicePricings(serviceId: string, businessId: string) {
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId,
      },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    return await prisma.servicePricing.findMany({
      where: {
        serviceId,
        businessId,
      },
      include: {
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: { basePrice: "asc" },
    });
  }

  /**
   * Update service pricing
   */
  static async updateServicePricing(
    pricingId: string,
    businessId: string,
    data: UpdateServicePricingData
  ) {
    const pricing = await prisma.servicePricing.findFirst({
      where: { id: pricingId, businessId },
    });

    if (!pricing) {
      throw new Error("Service pricing not found");
    }

    // Check if name is being changed and already exists
    if (data.name && data.name !== pricing.name) {
      const existingPricing = await prisma.servicePricing.findFirst({
        where: {
          serviceId: pricing.serviceId,
          name: data.name,
          id: { not: pricingId },
        },
      });

      if (existingPricing) {
        throw new Error(
          "Pricing with this name already exists for this service"
        );
      }
    }

    const updatedPricing = await prisma.servicePricing.update({
      where: { id: pricingId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    return updatedPricing;
  }

  /**
   * Delete service pricing
   */
  static async deleteServicePricing(pricingId: string, businessId: string) {
    const pricing = await prisma.servicePricing.findFirst({
      where: { id: pricingId, businessId },
      include: {
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!pricing) {
      throw new Error("Service pricing not found");
    }

    if (pricing._count.orderItems > 0) {
      // Soft delete - mark as inactive
      await prisma.servicePricing.update({
        where: { id: pricingId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
      return { success: true, softDeleted: true };
    } else {
      // Hard delete if no order items
      await prisma.servicePricing.delete({
        where: { id: pricingId },
      });
      return { success: true, softDeleted: false };
    }
  }

  /**
   * Get service statistics
   */
  static async getServiceStats(
    businessId: string,
    days: number = 30
  ): Promise<ServiceStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalServices,
      activeServices,
      servicesByCategory,
      popularServicesData,
      pricingStats,
    ] = await Promise.all([
      // Total services
      prisma.service.count({
        where: { businessId },
      }),

      // Active services
      prisma.service.count({
        where: { businessId, isActive: true },
      }),

      // Services by category
      prisma.service.groupBy({
        by: ["category"],
        where: { businessId },
        _count: { id: true },
      }),

      // Popular services (by order count and revenue)
      prisma.orderItem.groupBy({
        by: ["serviceId"],
        where: {
          order: {
            businessId,
            createdAt: { gte: startDate },
          },
        },
        _count: { id: true },
        _sum: { totalPrice: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 10,
      }),

      // Pricing statistics
      prisma.servicePricing.groupBy({
        by: ["pricingType"],
        where: {
          businessId,
          isActive: true,
        },
        _count: { id: true },
        _avg: { basePrice: true },
      }),
    ]);

    // Format category counts
    const byCategory = servicesByCategory.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get service details for popular services
    const serviceIds = popularServicesData.map((item) => item.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, category: true },
    });

    const serviceMap = services.reduce((acc, service) => {
      acc[service.id] = service;
      return acc;
    }, {} as Record<string, { name: string; category: ServiceCategory }>);

    const popularServices = popularServicesData.map((item) => {
      const service = serviceMap[item.serviceId];
      return {
        id: item.serviceId,
        name: service?.name || "Unknown",
        category: service?.category || ("OTHER" as ServiceCategory),
        orderCount: item._count.id,
        revenue: Number(item._sum.totalPrice || 0),
      };
    });

    // Calculate average price and pricing distribution
    const totalPricingValue = pricingStats.reduce(
      (sum, stat) => sum + Number(stat._avg.basePrice || 0) * stat._count.id,
      0
    );
    const totalPricingCount = pricingStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0
    );
    const averagePrice =
      totalPricingCount > 0 ? totalPricingValue / totalPricingCount : 0;

    const pricingDistribution = pricingStats.reduce((acc, item) => {
      acc[item.pricingType] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalServices,
      activeServices,
      byCategory,
      popularServices,
      averagePrice: Math.round(averagePrice * 100) / 100,
      pricingDistribution,
    };
  }

  /**
   * Get services for order creation (active services with pricing)
   */
  static async getServicesForOrder(businessId: string) {
    return await prisma.service.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        pricings: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  /**
   * Search services by name or category
   */
  static async searchServices(
    businessId: string,
    query: string,
    limit: number = 10
  ) {
    return await prisma.service.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { category: { equals: query.toUpperCase() as ServiceCategory } },
        ],
      },
      include: {
        pricings: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
          take: 3, // Show top 3 pricing options
        },
      },
      take: limit,
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get service performance analytics
   */
  static async getServicePerformance(
    serviceId: string,
    businessId: string,
    days: number = 90
  ) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    const [orderStats, revenueStats, dailyStats] = await Promise.all([
      // Order statistics
      prisma.orderItem.aggregate({
        where: {
          serviceId,
          order: {
            businessId,
            createdAt: { gte: startDate },
          },
        },
        _count: { id: true },
        _sum: { quantity: true, totalPrice: true },
        _avg: { unitPrice: true },
      }),

      // Revenue by status
      prisma.orderItem.aggregate({
        where: {
          serviceId,
          order: {
            businessId,
            createdAt: { gte: startDate },
            status: { in: ["COMPLETED", "DELIVERED"] },
          },
        },
        _sum: { totalPrice: true },
      }),

      // Daily performance
      prisma.$queryRaw`
        SELECT 
          DATE(o.created_at) as date,
          COUNT(oi.id) as order_count,
          SUM(oi.total_price) as revenue,
          SUM(oi.quantity) as quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.service_id = ${serviceId}
          AND o.business_id = ${businessId}
          AND o.created_at >= ${startDate}
        GROUP BY DATE(o.created_at)
        ORDER BY DATE(o.created_at) ASC
      `,
    ]);

    return {
      service: {
        id: service.id,
        name: service.name,
        category: service.category,
      },
      summary: {
        totalOrders: orderStats._count.id,
        totalQuantity: Number(orderStats._sum.quantity || 0),
        totalRevenue: Number(orderStats._sum.totalPrice || 0),
        averagePrice: Number(orderStats._avg.unitPrice || 0),
      },
      dailyPerformance: dailyStats,
      period: { startDate, endDate: new Date(), days },
    };
  }

  /**
   * Get services with low performance (for optimization)
   */
  static async getLowPerformanceServices(
    businessId: string,
    days: number = 90
  ) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const services = await prisma.service.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        orderItems: {
          where: {
            order: {
              createdAt: { gte: startDate },
            },
          },
        },
        pricings: {
          where: { isActive: true },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    return services
      .filter((service) => service.orderItems.length < 5) // Less than 5 orders in the period
      .map((service) => ({
        id: service.id,
        name: service.name,
        category: service.category,
        orderCount: service.orderItems.length,
        revenue: service.orderItems.reduce(
          (sum, item) => sum + Number(item.totalPrice),
          0
        ),
        pricingCount: service.pricings.length,
        lastUsed: service.orderItems[0]?.createdAt || null,
      }))
      .sort((a, b) => a.orderCount - b.orderCount);
  }

  /**
   * Duplicate service with pricings
   */
  static async duplicateService(
    serviceId: string,
    businessId: string,
    newName: string
  ) {
    const originalService = await prisma.service.findFirst({
      where: { id: serviceId, businessId },
      include: {
        pricings: true,
      },
    });

    if (!originalService) {
      throw new Error("Service not found");
    }

    // Check if new name already exists
    const existingService = await prisma.service.findFirst({
      where: {
        businessId,
        name: newName,
      },
    });

    if (existingService) {
      throw new Error("Service with this name already exists");
    }

    const duplicatedService = await prisma.$transaction(async (tx) => {
      // Create new service
      const newService = await tx.service.create({
        data: {
          businessId,
          name: newName,
          description: originalService.description,
          category: originalService.category,
          isActive: originalService.isActive,
        },
      });

      // Duplicate pricings
      if (originalService.pricings.length > 0) {
        await tx.servicePricing.createMany({
          data: originalService.pricings.map((pricing) => ({
            serviceId: newService.id,
            businessId,
            name: pricing.name,
            description: pricing.description,
            pricingType: pricing.pricingType,
            basePrice: pricing.basePrice,
            minQuantity: pricing.minQuantity,
            maxQuantity: pricing.maxQuantity,
            unit: pricing.unit,
            isActive: pricing.isActive,
          })),
        });
      }

      return newService;
    });

    return duplicatedService;
  }

  /**
   * Get services by category for menu display
   */
  static async getServicesByCategory(businessId: string) {
    const services = await prisma.service.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        pricings: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const servicesByCategory = services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {} as Record<ServiceCategory, typeof services>);

    return servicesByCategory;
  }
}

export default ServiceDatabaseService;
