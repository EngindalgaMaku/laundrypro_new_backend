import { Customer } from "@prisma/client";
import { WhatsAppDatabaseService } from "./whatsapp";
import { prisma } from "@/lib/db";

export interface CustomerFilters {
  businessId: string;
  search?: string; // Search in name, phone, email
  city?: string;
  district?: string;
  isActive?: boolean;
  whatsappVerified?: boolean;
  hasOrders?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  sortBy?: "createdAt" | "firstName" | "lastName" | "city";
  sortOrder?: "asc" | "desc";
}

export interface CreateCustomerData {
  businessId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  district?: string;
  customerType?: string;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  whatsappVerified?: boolean;
  address?: string;
  city?: string;
  district?: string;
  customerType?: string;
  isActive?: boolean;
}

export interface CustomerStats {
  total: number;
  active: number;
  withWhatsApp: number;
  withOrders: number;
  byCity: Record<string, number>;
  newThisMonth: number;
  averageOrdersPerCustomer: number;
}

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string | null;
  city?: string | null;
  district?: string | null;
  isActive: boolean;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: Date | null;
  whatsappVerified: boolean;
}

export class CustomerDatabaseService {
  /**
   * Create a new customer
   */
  static async createCustomer(data: CreateCustomerData) {
    // Check if customer with same phone already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        businessId: data.businessId,
        phone: data.phone,
      },
    });

    if (existingCustomer) {
      throw new Error("Customer with this phone number already exists");
    }

    const customer = await prisma.customer.create({
      data: {
        businessId: data.businessId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        whatsapp: data.whatsapp,
        address: data.address,
        city: data.city,
        district: data.district,
        customerType: data.customerType || "individual",
        whatsappVerified: false,
      },
    });

    // Send welcome WhatsApp message if WhatsApp number provided AND WhatsApp is configured for this business
    if (customer.whatsapp) {
      try {
        const waSettings = await prisma.whatsAppSettings.findUnique({
          where: { businessId: data.businessId },
        });

        const isConfigured =
          !!waSettings &&
          waSettings.isEnabled === true &&
          !!waSettings.accessToken &&
          !!waSettings.phoneNumberId;

        if (isConfigured) {
          await WhatsAppDatabaseService.sendMessage({
            businessId: data.businessId,
            customerId: customer.id,
            phoneNumber: customer.whatsapp,
            templateName: "welcome_customer",
            templateParams: [{ type: "text", text: customer.firstName }],
            languageCode: "tr",
          });
        } else {
          // Silently skip sending if not configured
          // console.info(
          //   `WhatsApp not configured for business ${data.businessId}, skipping welcome message.`
          // );
        }
      } catch (error) {
        console.warn("Failed to send welcome WhatsApp message:", error);
        // Don't throw error, just log it as a warning
      }
    }

    return customer;
  }

  /**
   * Get customers with filters and pagination
   */
  static async getCustomers(
    filters: CustomerFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search } },
        { whatsapp: { contains: filters.search } },
      ];
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.district) {
      where.district = filters.district;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.whatsappVerified !== undefined) {
      where.whatsappVerified = filters.whatsappVerified;
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate,
      };
    }

    if (filters.hasOrders !== undefined) {
      if (filters.hasOrders) {
        where.orders = { some: {} };
      } else {
        where.orders = { none: {} };
      }
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true,
              whatsappMessages: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  /**
   * Get customer by ID with detailed information
   */
  static async getCustomerById(customerId: string, businessId: string) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
      },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            pickupDate: true,
            deliveryDate: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10, // Last 10 orders
        },
        whatsappMessages: {
          select: {
            id: true,
            direction: true,
            type: true,
            content: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20, // Last 20 messages
        },
        _count: {
          select: {
            orders: true,
            whatsappMessages: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Calculate total spent
    const orderStats = await prisma.order.aggregate({
      where: {
        customerId,
        businessId,
        status: { in: ["COMPLETED", "DELIVERED"] },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      ...customer,
      totalSpent: Number(orderStats._sum.totalAmount || 0),
      completedOrders: orderStats._count.id,
    };
  }

  /**
   * Update customer
   */
  static async updateCustomer(
    customerId: string,
    businessId: string,
    data: UpdateCustomerData
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if phone number is being changed and already exists
    if (data.phone && data.phone !== customer.phone) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          businessId,
          phone: data.phone,
          id: { not: customerId },
        },
      });

      if (existingCustomer) {
        throw new Error("Customer with this phone number already exists");
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            orders: true,
            whatsappMessages: true,
          },
        },
      },
    });

    return updatedCustomer;
  }

  /**
   * Delete customer (soft delete)
   */
  static async deleteCustomer(customerId: string, businessId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (customer._count.orders > 0) {
      // Soft delete - mark as inactive
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
      return { success: true, softDeleted: true };
    } else {
      // Hard delete if no orders
      await prisma.customer.delete({
        where: { id: customerId },
      });
      return { success: true, softDeleted: false };
    }
  }

  /**
   * Get customer statistics
   */
  static async getCustomerStats(
    businessId: string,
    days: number = 30
  ): Promise<CustomerStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const [
      totalCustomers,
      activeCustomers,
      whatsappCustomers,
      customersWithOrders,
      customersByCity,
      newThisMonth,
      orderStats,
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: { businessId },
      }),

      // Active customers
      prisma.customer.count({
        where: { businessId, isActive: true },
      }),

      // Customers with WhatsApp
      prisma.customer.count({
        where: {
          businessId,
          whatsapp: { not: null },
          whatsappVerified: true,
        },
      }),

      // Customers with orders
      prisma.customer.count({
        where: {
          businessId,
          orders: { some: {} },
        },
      }),

      // Customers by city
      prisma.customer.groupBy({
        by: ["city"],
        where: {
          businessId,
          city: { not: null },
        },
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
      }),

      // New customers this month
      prisma.customer.count({
        where: {
          businessId,
          createdAt: { gte: thisMonth },
        },
      }),

      // Order statistics for average calculation
      prisma.order.groupBy({
        by: ["customerId"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),
    ]);

    const byCity = customersByCity.reduce((acc, item) => {
      if (item.city) {
        acc[item.city] = item._count.id;
      }
      return acc;
    }, {} as Record<string, number>);

    const averageOrdersPerCustomer =
      orderStats.length > 0
        ? orderStats.reduce((sum, stat) => sum + stat._count.id, 0) /
          orderStats.length
        : 0;

    return {
      total: totalCustomers,
      active: activeCustomers,
      withWhatsApp: whatsappCustomers,
      withOrders: customersWithOrders,
      byCity,
      newThisMonth,
      averageOrdersPerCustomer:
        Math.round(averageOrdersPerCustomer * 100) / 100,
    };
  }

  /**
   * Get customers summary for dashboard
   */
  static async getCustomersSummary(
    businessId: string,
    limit: number = 100
  ): Promise<CustomerSummary[]> {
    const customers = await prisma.customer.findMany({
      where: { businessId },
      include: {
        orders: {
          select: {
            totalAmount: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return customers.map((customer) => {
      const completedOrders = customer.orders.filter(
        (order) => order.status === "COMPLETED" || order.status === "DELIVERED"
      );

      const totalSpent = completedOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        city: customer.city,
        district: customer.district,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        orderCount: customer.orders.length,
        totalSpent,
        lastOrderDate: customer.orders[0]?.createdAt || null,
        whatsappVerified: customer.whatsappVerified,
      };
    });
  }

  /**
   * Search customers by phone or name
   */
  static async searchCustomers(
    businessId: string,
    query: string,
    limit: number = 10
  ) {
    return await prisma.customer.findMany({
      where: {
        businessId,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { phone: { contains: query } },
          { whatsapp: { contains: query } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        city: true,
        district: true,
        address: true,
      },
      take: limit,
    });
  }

  /**
   * Get customers without recent orders (for retention campaigns)
   */
  static async getInactiveCustomers(
    businessId: string,
    daysSinceLastOrder: number = 90
  ) {
    const cutoffDate = new Date(
      Date.now() - daysSinceLastOrder * 24 * 60 * 60 * 1000
    );

    const customers = await prisma.customer.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          // Customers with no orders
          { orders: { none: {} } },
          // Customers with last order before cutoff date
          {
            orders: {
              every: {
                createdAt: { lt: cutoffDate },
              },
            },
          },
        ],
      },
      include: {
        orders: {
          select: {
            id: true,
            createdAt: true,
            status: true,
            totalAmount: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return customers.map((customer) => ({
      ...customer,
      lastOrderDate: customer.orders[0]?.createdAt || null,
      daysSinceLastOrder: customer.orders[0]?.createdAt
        ? Math.floor(
            (Date.now() - customer.orders[0].createdAt.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    }));
  }

  /**
   * Get top customers by spending
   */
  static async getTopCustomers(businessId: string, limit: number = 10) {
    const customers = await prisma.customer.findMany({
      where: { businessId, isActive: true },
      include: {
        orders: {
          where: {
            status: { in: ["COMPLETED", "DELIVERED"] },
          },
          select: {
            totalAmount: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return customers
      .map((customer) => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        city: customer.city,
        totalSpent: customer.orders.reduce(
          (sum, order) => sum + Number(order.totalAmount),
          0
        ),
        orderCount: customer._count.orders,
      }))
      .filter((customer) => customer.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  /**
   * Get customers by city/district
   */
  static async getCustomersByLocation(businessId: string) {
    const locations = await prisma.customer.groupBy({
      by: ["city", "district"],
      where: {
        businessId,
        isActive: true,
        city: { not: null },
      },
      _count: { id: true },
      orderBy: [{ city: "asc" }, { district: "asc" }],
    });

    return locations.reduce((acc, location) => {
      const city = location.city || "Unknown";
      const district = location.district || "Unknown";

      if (!acc[city]) {
        acc[city] = {};
      }
      acc[city][district] = location._count.id;

      return acc;
    }, {} as Record<string, Record<string, number>>);
  }

  /**
   * Verify customer WhatsApp number
   */
  static async verifyWhatsApp(customerId: string, businessId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.whatsapp) {
      throw new Error("Customer does not have a WhatsApp number");
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        whatsappVerified: true,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Import customers from CSV data
   */
  static async importCustomers(
    businessId: string,
    customersData: CreateCustomerData[]
  ) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const customerData of customersData) {
      try {
        await this.createCustomer({
          ...customerData,
          businessId,
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${customerData.firstName} ${customerData.lastName}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return results;
  }

  /**
   * Get customer communication preferences and history
   */
  static async getCustomerCommunication(
    customerId: string,
    businessId: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    const whatsappStats = await WhatsAppDatabaseService.getConversationSummary(
      businessId,
      customerId
    );

    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        whatsappVerified: customer.whatsappVerified,
        email: customer.email,
      },
      whatsapp: whatsappStats,
    };
  }
}

export default CustomerDatabaseService;
