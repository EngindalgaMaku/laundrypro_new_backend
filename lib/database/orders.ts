import {
  OrderStatus,
  ServiceCategory,
  Priority,
  PaymentMethod,
} from "@prisma/client";
import { WhatsAppDatabaseService } from "./whatsapp";
import { prisma } from "@/lib/db";

export interface OrderFilters {
  businessId: string;
  customerId?: string;
  status?: OrderStatus[];
  serviceCategory?: ServiceCategory[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  assignedUserId?: string;
  priority?: Priority;
  search?: string; // Search in order number, customer name, notes
  sortBy?: "createdAt" | "pickupDate" | "deliveryDate" | "totalAmount";
  sortOrder?: "asc" | "desc";
}

export interface CreateOrderData {
  businessId: string;
  customerId: string;
  services?: Array<{
    serviceId?: string; // Optional for manual entries
    serviceName?: string; // For manual entries
    serviceDescription?: string; // For manual entries
    isManualEntry?: boolean; // Flag to identify manual entries
    // Frontend compatibility fields
    id?: string; // Frontend sends this for both DB and manual services
    name?: string; // Frontend sends service name here
    price?: number; // Frontend sends unit price as 'price'
    description?: string; // Frontend description field
    // Backend fields
    quantity: number;
    unitPrice?: number; // Make optional since frontend uses 'price'
    notes?: string;
    fabricType?: string;
    stainType?: string;
    specialInstructions?: string;
  }>;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupDate?: Date;
  deliveryDate?: Date;
  orderInfo?: string; // Sipariş Bilgisi - ana sipariş açıklaması
  deliveryNotes?: string; // Teslimat Notu - teslimat özel talimatları
  referenceCode?: string; // Referans Kodu
  notes?: string; // Genel notlar
  specialInstructions?: string; // Özel talimatlar
  priority?: Priority;
  assignedUserId?: string;
  discountAmount?: number;
  discountReason?: string;
  paymentMethod?: PaymentMethod;
  totalAmount?: number; // when no services provided
}

export interface UpdateOrderData {
  status?: OrderStatus;
  pickupDate?: Date;
  deliveryDate?: Date;
  assignedUserId?: string;
  orderInfo?: string;
  deliveryNotes?: string;
  referenceCode?: string;
  notes?: string;
  specialInstructions?: string;
  priority?: Priority;
  paymentMethod?: PaymentMethod;
  paidAmount?: number;
  discountAmount?: number;
  discountReason?: string;
}

export interface OrderStats {
  total: number;
  byStatus: Record<string, number>;
  byServiceCategory: Record<string, number>;
  revenue: {
    total: number;
    paid: number;
    pending: number;
  };
  averageOrderValue: number;
  averageProcessingTime: number; // in hours
}

export class OrderDatabaseService {
  /**
   * Create a new order
   */
  static async createOrder(data: CreateOrderData) {
    // Generate order number
    const orderCount = await prisma.order.count({
      where: { businessId: data.businessId },
    });
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${(
      orderCount + 1
    )
      .toString()
      .padStart(3, "0")}`;

    // Calculate totals
    let subtotal = 0;
    const serviceItems: Array<{
      serviceId: string | null;
      serviceName: string;
      serviceDescription?: string;
      isManualEntry: boolean;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes?: string;
    }> = [];

    if (data.services && data.services.length > 0) {
      for (const service of data.services) {
        let serviceData = null;

        // Normalize data from frontend format to backend format
        const isManualEntry =
          service.isManualEntry ||
          (service.id && service.id.startsWith("temp-")) ||
          (service.id && service.id.startsWith("manual-")) ||
          !service.serviceId;

        const serviceName =
          service.serviceName || service.name || "Manual Service";
        const serviceDescription =
          service.serviceDescription ||
          service.description ||
          "Custom service entry";
        const unitPrice = service.unitPrice || service.price || 0;

        // Handle manual entries vs database services
        if (isManualEntry) {
          // Manual entry - create a temporary service record for processing
          serviceData = {
            id: null, // Will be null in database for manual entries
            name: serviceName,
            description: serviceDescription,
            category: "OTHER", // Default category for manual entries
            businessId: data.businessId,
            isManualEntry: true,
          };
        } else {
          // Database service - validate it exists
          const serviceId = service.serviceId || service.id;
          serviceData = await prisma.service.findUnique({
            where: { id: serviceId },
          });

          if (!serviceData) {
            throw new Error(`Service with ID ${serviceId} not found`);
          }
        }

        const itemTotal = service.quantity * unitPrice;
        subtotal += itemTotal;

        serviceItems.push({
          serviceId: isManualEntry
            ? null
            : service.serviceId || service.id || null, // null for manual entries
          serviceName: serviceData.name,
          serviceDescription: serviceData.description || undefined,
          isManualEntry: isManualEntry,
          quantity: service.quantity,
          unitPrice: unitPrice,
          totalPrice: itemTotal,
          notes: service.notes || service.description,
        });
      }
    } else {
      // Services not provided -> use provided totalAmount (manual)
      subtotal = Number(data.totalAmount || 0);
    }

    const totalAmount = subtotal;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          businessId: data.businessId,
          customerId: data.customerId,
          orderNumber,
          status: "PENDING",
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          pickupDate: data.pickupDate,
          deliveryDate: data.deliveryDate,
          subtotal,
          totalAmount,
          orderInfo: data.orderInfo,
          deliveryNotes: data.deliveryNotes,
          referenceCode: data.referenceCode,
          notes: data.notes,
          specialInstructions: data.specialInstructions,
          priority: data.priority || "NORMAL",
          assignedUserId: data.assignedUserId,
          paymentMethod: data.paymentMethod,
        },
      });

      // Create order items if provided
      if (serviceItems.length > 0) {
        for (const item of serviceItems) {
          const orderItemData: any = {
            orderId: newOrder.id,
            serviceName: item.serviceName, // Store name directly for manual entries
            serviceDescription: item.serviceDescription,
            isManualEntry: item.isManualEntry,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          };

          // Only include serviceId if it's not null (for database services)
          if (item.serviceId) {
            orderItemData.serviceId = item.serviceId;
          }

          await tx.orderItem.create({
            data: orderItemData,
          });
        }
      }

      // Fetch complete order with relations
      const completeOrder = await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
              email: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return completeOrder!;
    });

    // Send WhatsApp notification for order confirmation (only if WA configured)
    const waSettings = await prisma.whatsAppSettings.findUnique({
      where: { businessId: data.businessId },
      select: { isEnabled: true },
    });
    if (
      waSettings?.isEnabled &&
      (order.customer.whatsapp || order.customer.phone)
    ) {
      try {
        await WhatsAppDatabaseService.sendMessage({
          businessId: data.businessId,
          customerId: data.customerId,
          orderId: order.id,
          phoneNumber: order.customer.whatsapp || order.customer.phone!,
          templateName: "order_confirmation",
          templateParams: [
            { type: "text", text: order.customer.firstName || "Müşteri" },
            { type: "text", text: orderNumber },
            { type: "text", text: `${totalAmount.toFixed(2)} TL` },
          ],
          languageCode: "tr",
        });
      } catch (error) {
        console.warn(
          "WhatsApp bildirimi gönderilemedi (devam ediliyor):",
          error
        );
        // Don't throw error, just log it
      }
    }

    return order;
  }

  /**
   * Get orders with filters and pagination - Enhanced with comprehensive error handling
   */
  static async getOrders(
    filters: OrderFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      console.log(`[ORDERS-DB] Starting getOrders with filters:`, {
        businessId: filters.businessId,
        hasStatus: !!filters.status,
        hasSearch: !!filters.search,
        limit,
        offset,
      });

      const where: any = {
        businessId: filters.businessId,
      };

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.status && filters.status.length > 0) {
        where.status = { in: filters.status };
      }

      if (filters.assignedUserId) {
        where.assignedUserId = filters.assignedUserId;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.startDate,
          lte: filters.dateRange.endDate,
        };
      }

      if (filters.search) {
        where.OR = [
          { orderNumber: { contains: filters.search } },
          { notes: { contains: filters.search } },
          {
            customer: {
              OR: [
                { firstName: { contains: filters.search } },
                { lastName: { contains: filters.search } },
                { phone: { contains: filters.search } },
              ],
            },
          },
        ];
      }

      if (filters.serviceCategory && filters.serviceCategory.length > 0) {
        where.orderItems = {
          some: {
            service: {
              category: { in: filters.serviceCategory },
            },
          },
        };
      }

      const orderBy: any = {};
      if (filters.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || "desc";
      } else {
        orderBy.createdAt = "desc";
      }

      console.log(`[ORDERS-DB] Executing database query with where:`, where);

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                whatsapp: true,
                email: true,
                address: true,
                city: true,
                district: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            orderItems: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    description: true,
                  },
                },
              },
            },
            _count: {
              select: {
                orderItems: true,
              },
            },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.order.count({ where }),
      ]);

      // Log results and validate data integrity
      console.log(`[ORDERS-DB] Query completed successfully:`, {
        ordersCount: orders.length,
        total,
        hasOrderItems: orders.some(
          (o) => o.orderItems && o.orderItems.length > 0
        ),
      });

      // Validate each order has essential fields and log missing data
      orders.forEach((order, index) => {
        const missingFields = [];
        if (
          !order.orderInfo &&
          !order.notes &&
          !order.deliveryNotes &&
          !order.specialInstructions &&
          !order.referenceCode
        ) {
          missingFields.push("all_critical_fields");
        }
        if (!order.orderItems || order.orderItems.length === 0) {
          missingFields.push("orderItems");
        }
        if (!order.customer) {
          missingFields.push("customer");
        }

        if (missingFields.length > 0) {
          console.warn(
            `[ORDERS-DB] Order ${order.id} is missing fields:`,
            missingFields
          );
        }
      });

      return { orders, total };
    } catch (error) {
      console.error(`[ORDERS-DB] Critical error in getOrders:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        filters,
        limit,
        offset,
      });
      throw new Error(
        `Failed to retrieve orders: ${
          error instanceof Error ? error.message : "Unknown database error"
        }`
      );
    }
  }

  /**
   * Get order by ID - Enhanced with comprehensive error handling and validation
   */
  static async getOrderById(orderId: string, businessId: string) {
    try {
      console.log(
        `[ORDERS-DB] Fetching order ${orderId} for business ${businessId}`
      );

      if (!orderId || !businessId) {
        throw new Error("Order ID and Business ID are required");
      }

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          businessId,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
              email: true,
              address: true,
              city: true,
              district: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          orderItems: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  description: true,
                },
              },
            },
          },
          eInvoices: {
            select: {
              id: true,
              invoiceNumber: true,
              gibStatus: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      });

      if (!order) {
        console.warn(
          `[ORDERS-DB] Order ${orderId} not found for business ${businessId}`
        );
        throw new Error("Order not found");
      }

      // Validate order data integrity and log issues
      const validationIssues = [];

      if (!order.customer) {
        validationIssues.push("missing_customer");
      }

      if (!order.orderItems || order.orderItems.length === 0) {
        validationIssues.push("missing_order_items");
      }

      // Check for missing critical fields
      const missingCriticalFields = [];
      if (!order.orderInfo) missingCriticalFields.push("orderInfo");
      if (!order.deliveryNotes) missingCriticalFields.push("deliveryNotes");
      if (!order.referenceCode) missingCriticalFields.push("referenceCode");
      if (!order.notes) missingCriticalFields.push("notes");
      if (!order.specialInstructions)
        missingCriticalFields.push("specialInstructions");

      if (missingCriticalFields.length > 0) {
        validationIssues.push(
          `missing_critical_fields:${missingCriticalFields.join(",")}`
        );
      }

      // Log validation issues for monitoring
      if (validationIssues.length > 0) {
        console.warn(
          `[ORDERS-DB] Order ${orderId} has validation issues:`,
          validationIssues
        );
      }

      // Log successful retrieval with item count
      console.log(`[ORDERS-DB] Successfully retrieved order ${orderId}:`, {
        hasCustomer: !!order.customer,
        orderItemsCount: order.orderItems?.length || 0,
        hasCriticalFields: missingCriticalFields.length < 5,
        validationIssues: validationIssues.length,
      });

      return order;
    } catch (error) {
      console.error(`[ORDERS-DB] Critical error fetching order ${orderId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        orderId,
        businessId,
      });

      // Re-throw with enhanced error message
      if (error instanceof Error && error.message === "Order not found") {
        throw error; // Keep original error for 404 handling
      }

      throw new Error(
        `Failed to retrieve order: ${
          error instanceof Error ? error.message : "Unknown database error"
        }`
      );
    }
  }

  /**
   * Update order
   */
  static async updateOrder(
    orderId: string,
    businessId: string,
    data: UpdateOrderData
  ) {
    // Get current order
    const currentOrder = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        customer: {
          select: {
            firstName: true,
            phone: true,
            whatsapp: true,
          },
        },
      },
    });

    if (!currentOrder) {
      throw new Error("Order not found");
    }

    const oldStatus = currentOrder.status;

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.pickupDate !== undefined && { pickupDate: data.pickupDate }),
        ...(data.deliveryDate !== undefined && {
          deliveryDate: data.deliveryDate,
        }),
        ...(data.assignedUserId !== undefined && {
          assignedUserId: data.assignedUserId,
        }),
        ...(data.orderInfo !== undefined && { orderInfo: data.orderInfo }),
        ...(data.deliveryNotes !== undefined && {
          deliveryNotes: data.deliveryNotes,
        }),
        ...(data.referenceCode !== undefined && {
          referenceCode: data.referenceCode,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.specialInstructions !== undefined && {
          specialInstructions: data.specialInstructions,
        }),
        ...(data.priority && { priority: data.priority }),
        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
          },
        },
        orderItems: {
          include: {
            service: true,
          },
        },
      },
    });

    // Send WhatsApp notification if status changed
    if (
      data.status &&
      data.status !== oldStatus &&
      (currentOrder.customer.whatsapp || currentOrder.customer.phone)
    ) {
      try {
        const templateName = this.getStatusTemplate(data.status);
        if (templateName) {
          await WhatsAppDatabaseService.sendMessage({
            businessId,
            customerId: currentOrder.customerId,
            orderId,
            phoneNumber:
              currentOrder.customer.whatsapp || currentOrder.customer.phone!,
            templateName,
            templateParams: [
              {
                type: "text",
                text: currentOrder.customer.firstName || "Müşteri",
              },
              { type: "text", text: currentOrder.orderNumber },
              { type: "text", text: this.getStatusText(data.status) },
            ],
            languageCode: "tr",
          });
        }
      } catch (error) {
        console.error("Failed to send status update notification:", error);
      }
    }

    return updatedOrder;
  }

  /**
   * Delete order (soft delete)
   */
  static async deleteOrder(orderId: string, businessId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        routeStopOrders: {
          include: {
            routeStop: {
              include: {
                route: {
                  select: { id: true, status: true, routeName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Prevent deleting if order is part of an active route
    const activeRouteLink = order.routeStopOrders.find(
      (rso: any) =>
        rso.routeStop?.route?.status &&
        ["PLANNED", "ASSIGNED", "IN_PROGRESS"].includes(
          rso.routeStop.route.status
        )
    );

    if (activeRouteLink) {
      const route = activeRouteLink.routeStop.route;
      const err: any = new Error(
        `Order is assigned to an active route (${route.routeName || route.id}).`
      );
      err.code = "ORDER_ASSIGNED_TO_ROUTE";
      err.routeId = route.id;
      err.routeStatus = route.status;
      throw err;
    }

    if (order.status !== "PENDING" && order.status !== "CANCELLED") {
      const err: any = new Error(
        "Only orders in PENDING or CANCELLED status can be deleted"
      );
      err.code = "ORDER_NOT_DELETABLE";
      err.currentStatus = order.status;
      throw err;
    }

    // If already CANCELLED or PENDING and not on active route, perform hard delete
    // Clean up related records first to avoid FK constraint issues
    await prisma.routeStopOrder
      .deleteMany({ where: { orderId } })
      .catch(() => {});
    await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.order.delete({ where: { id: orderId } });

    return { success: true, hardDeleted: true };
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(
    businessId: string,
    days: number = 30
  ): Promise<OrderStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      statusCounts,
      serviceTypeCounts,
      revenueStats,
      completedOrders,
    ] = await Promise.all([
      // Total orders
      prisma.order.count({
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
      }),

      // Orders by status
      prisma.order.groupBy({
        by: ["status"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { _all: true },
      }),

      // Orders by service category
      prisma.orderItem.groupBy({
        by: ["serviceId"],
        where: {
          order: {
            businessId,
            createdAt: { gte: startDate },
          },
        },
        _count: { _all: true },
      }),

      // Revenue statistics
      prisma.order.aggregate({
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _sum: {
          totalAmount: true,
          subtotal: true,
        },
        _avg: {
          totalAmount: true,
        },
      }),

      // Completed orders for processing time calculation
      prisma.order.findMany({
        where: {
          businessId,
          status: "COMPLETED",
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Calculate processing time
    let totalProcessingTime = 0;
    if (completedOrders.length > 0) {
      totalProcessingTime =
        completedOrders.reduce((acc, order) => {
          const processingTime =
            (order.updatedAt.getTime() - order.createdAt.getTime()) /
            (1000 * 60 * 60);
          return acc + processingTime;
        }, 0) / completedOrders.length;
    }

    // Format status counts
    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = (item._count as any)._all as number;
      return acc;
    }, {} as Record<string, number>);

    // Get service category counts (need to fetch service data) - with null handling
    const serviceIds = [
      ...new Set(serviceTypeCounts.map((item) => item.serviceId)),
    ].filter((id): id is string => id !== null); // Filter out null values and type assertion

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, category: true },
    });

    const serviceCategoryMap = services.reduce((acc, service) => {
      acc[service.id] = service.category;
      return acc;
    }, {} as Record<string, string>);

    const byServiceCategory = serviceTypeCounts.reduce((acc, item) => {
      // Handle null serviceId (manual services)
      const serviceCategory = item.serviceId
        ? serviceCategoryMap[item.serviceId] || "OTHER"
        : "MANUAL";
      const count = (item._count as any)._all as number;
      acc[serviceCategory] = (acc[serviceCategory] || 0) + count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalOrders,
      byStatus,
      byServiceCategory,
      revenue: {
        total: Number(revenueStats._sum?.totalAmount || 0),
        paid: Number(revenueStats._sum?.subtotal || 0),
        pending:
          Number(revenueStats._sum?.totalAmount || 0) -
          Number(revenueStats._sum?.subtotal || 0),
      },
      averageOrderValue: Number(revenueStats._avg?.totalAmount || 0),
      averageProcessingTime: totalProcessingTime,
    };
  }

  /**
   * Get recent orders for dashboard
   */
  static async getRecentOrders(businessId: string, limit: number = 10) {
    return await prisma.order.findMany({
      where: { businessId },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get orders due for pickup/delivery today
   */
  static async getOrdersDueToday(businessId: string) {
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

    const [pickupDue, deliveryDue] = await Promise.all([
      prisma.order.findMany({
        where: {
          businessId,
          pickupDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          businessId,
          deliveryDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: { in: ["IN_PROGRESS", "READY_FOR_DELIVERY"] },
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
            },
          },
        },
      }),
    ]);

    return { pickupDue, deliveryDue };
  }

  /**
   * Get overdue orders
   */
  static async getOverdueOrders(businessId: string) {
    const now = new Date();

    return await prisma.order.findMany({
      where: {
        businessId,
        OR: [
          {
            pickupDate: { lt: now },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          {
            deliveryDate: { lt: now },
            status: { in: ["IN_PROGRESS", "READY_FOR_DELIVERY"] },
          },
        ],
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
          },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
  }

  /**
   * Helper: Get WhatsApp template name for status
   */
  private static getStatusTemplate(status: OrderStatus): string | null {
    const templates: Record<OrderStatus, string | null> = {
      PENDING: null,
      CONFIRMED: "order_confirmed",
      IN_PROGRESS: "order_in_progress",
      READY_FOR_PICKUP: "order_ready_pickup",
      READY_FOR_DELIVERY: "order_ready_delivery",
      OUT_FOR_DELIVERY: "order_out_for_delivery",
      DELIVERED: "order_delivered",
      COMPLETED: "order_completed",
      CANCELLED: "order_cancelled",
    };

    return templates[status];
  }

  /**
   * Helper: Get status text in Turkish
   */
  private static getStatusText(status: OrderStatus): string {
    const statusTexts: Record<OrderStatus, string> = {
      PENDING: "Beklemede",
      CONFIRMED: "Onaylandı",
      IN_PROGRESS: "İşlemde",
      READY_FOR_PICKUP: "Alım İçin Hazır",
      READY_FOR_DELIVERY: "Teslimat İçin Hazır",
      OUT_FOR_DELIVERY: "Teslimat Yolunda",
      DELIVERED: "Teslim Edildi",
      COMPLETED: "Tamamlandı",
      CANCELLED: "İptal Edildi",
    };

    return statusTexts[status];
  }
}

// Named export functions for API routes compatibility
export async function getDashboardStats(businessId: string, days: number = 30) {
  console.log(
    `[DEBUG] getDashboardStats called with businessId: ${businessId}, days: ${days}`
  );

  // Import CustomerDatabaseService dynamically to avoid circular dependency
  const { CustomerDatabaseService } = await import("./customers");

  // Get active orders count WITHOUT date filtering for dashboard display
  console.log("[DEBUG] Getting current active orders count...");
  const activeOrdersCount = await prisma.order.count({
    where: {
      businessId,
      status: {
        in: [
          "PENDING",
          "IN_PROGRESS",
          "CONFIRMED",
          "READY_FOR_PICKUP",
          "READY_FOR_DELIVERY",
          "OUT_FOR_DELIVERY",
        ],
      },
    },
  });

  console.log(
    `[DEBUG] Active orders count (no date filter): ${activeOrdersCount}`
  );

  // Get current status distribution WITHOUT date filtering
  const currentStatusCounts = await prisma.order.groupBy({
    by: ["status"],
    where: {
      businessId,
    },
    _count: { _all: true },
  });

  console.log(
    "[DEBUG] Current status counts (no date filter):",
    currentStatusCounts
  );

  // Get both order and customer stats (with date filtering for trends)
  const [orderStats, customerStats] = await Promise.all([
    OrderDatabaseService.getOrderStats(businessId, days),
    CustomerDatabaseService.getCustomerStats(businessId, days),
  ]);

  // Format current status counts without date filtering
  const currentByStatus = currentStatusCounts.reduce((acc, item) => {
    acc[item.status] = (item._count as any)._all as number;
    return acc;
  }, {} as Record<string, number>);

  console.log("[DEBUG] Formatted current status counts:", currentByStatus);

  // Calculate week-based customer metrics
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [newThisWeek, newPreviousWeek] = await Promise.all([
    prisma.customer.count({
      where: {
        businessId,
        createdAt: { gte: oneWeekAgo },
      },
    }),
    prisma.customer.count({
      where: {
        businessId,
        createdAt: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo,
        },
      },
    }),
  ]);

  // Calculate customer growth percentage
  const customerGrowth =
    newPreviousWeek > 0
      ? ((newThisWeek - newPreviousWeek) / newPreviousWeek) * 100
      : newThisWeek > 0
      ? 100
      : 0;

  // Calculate active orders from current status counts (no date filtering)
  const activeOrdersFromStatus =
    (currentByStatus.PENDING || 0) +
    (currentByStatus.IN_PROGRESS || 0) +
    (currentByStatus.CONFIRMED || 0) +
    (currentByStatus.READY_FOR_PICKUP || 0) +
    (currentByStatus.READY_FOR_DELIVERY || 0) +
    (currentByStatus.OUT_FOR_DELIVERY || 0);

  console.log(
    `[DEBUG] Calculated active orders from status: ${activeOrdersFromStatus}`
  );
  console.log(`[DEBUG] Direct active orders count: ${activeOrdersCount}`);

  // Return combined stats with customer data matching frontend expectations
  // Use current status counts (no date filter) for byStatus to show actual current state
  return {
    ...orderStats,
    byStatus: currentByStatus, // Use current status counts instead of date-filtered
    customers: {
      total: customerStats.total,
      newThisWeek,
      repeatCustomers: customerStats.withOrders, // Customers who have made orders
      growth: Math.round(customerGrowth * 100) / 100, // Round to 2 decimal places
    },
  };
}

export async function getOrders(
  filters: OrderFilters,
  limit: number = 50,
  offset: number = 0
) {
  console.log(
    `[DEBUG] getOrders called with filters:`,
    filters,
    `limit: ${limit}, offset: ${offset}`
  );
  return await OrderDatabaseService.getOrders(filters, limit, offset);
}

export default OrderDatabaseService;
