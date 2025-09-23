import { PrismaClient } from "@prisma/client";
import { createWhatsAppService } from "../whatsapp-service";

const prisma = new PrismaClient();

export interface WhatsAppMessageFilters {
  businessId: string;
  customerId?: string;
  orderId?: string;
  direction?: "INCOMING" | "OUTGOING";
  status?: string[];
  type?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  templateName?: string;
}

export interface SendMessageRequest {
  businessId: string;
  customerId?: string;
  orderId?: string;
  phoneNumber: string;
  message?: string;
  templateName?: string;
  templateParams?: Array<{ type: string; text: string }>;
  languageCode?: string;
}

export interface TemplateUsageStats {
  templateName: string;
  totalSent: number;
  successRate: number;
  lastUsed: Date;
  averageResponseTime?: number;
}

export class WhatsAppDatabaseService {
  /**
   * Get messages with filters and pagination
   */
  static async getMessages(
    filters: WhatsAppMessageFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate,
      };
    }

    if (filters.templateName) {
      where.templateName = filters.templateName;
    }

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.whatsAppMessage.count({ where }),
    ]);

    return { messages, total };
  }

  /**
   * Get conversation history for a customer
   */
  static async getCustomerConversation(
    businessId: string,
    customerId: string,
    limit: number = 100
  ) {
    return await prisma.whatsAppMessage.findMany({
      where: {
        businessId,
        customerId,
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
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" }, // Chronological order for conversation
      take: limit,
    });
  }

  /**
   * Send WhatsApp message
   */
  static async sendMessage(request: SendMessageRequest) {
    const whatsappService = await createWhatsAppService(
      request.businessId,
      prisma
    );

    if (!whatsappService) {
      throw new Error("WhatsApp Business API not configured for this business");
    }

    let result;

    if (request.templateName && request.templateParams) {
      // Send template message
      result = await whatsappService.sendTemplateMessage(
        request.phoneNumber,
        request.templateName,
        request.languageCode || "tr",
        request.templateParams,
        request.customerId,
        request.orderId,
        request.businessId
      );
    } else if (request.message) {
      // Send text message
      result = await whatsappService.sendTextMessage(
        request.phoneNumber,
        request.message,
        request.customerId,
        request.orderId,
        request.businessId
      );
    } else {
      throw new Error("Either message or template parameters must be provided");
    }

    return result;
  }

  /**
   * Get WhatsApp statistics for a business
   */
  static async getWhatsAppStats(businessId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      recentMessages,
      statusCounts,
      directionCounts,
      typeCounts,
      topTemplates,
    ] = await Promise.all([
      // Total messages
      prisma.whatsAppMessage.count({
        where: { businessId },
      }),

      // Recent messages
      prisma.whatsAppMessage.count({
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
      }),

      // Messages by status
      prisma.whatsAppMessage.groupBy({
        by: ["status"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      // Messages by direction
      prisma.whatsAppMessage.groupBy({
        by: ["direction"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      // Messages by type
      prisma.whatsAppMessage.groupBy({
        by: ["type"],
        where: {
          businessId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      // Top templates
      prisma.whatsAppMessage.groupBy({
        by: ["templateName"],
        where: {
          businessId,
          templateName: { not: null },
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 5,
      }),
    ]);

    const statusStats = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const directionStats = directionCounts.reduce((acc, item) => {
      acc[item.direction] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const typeStats = typeCounts.reduce((acc, item) => {
      acc[item.type] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Calculate delivery and read rates
    const sent = statusStats.sent || 0;
    const delivered = statusStats.delivered || 0;
    const read = statusStats.read || 0;

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;

    return {
      total: {
        messages: totalMessages,
        recent: recentMessages,
        days,
      },
      performance: {
        deliveryRate,
        readRate,
        successRate:
          sent > 0
            ? Math.round(((sent - (statusStats.failed || 0)) / sent) * 100)
            : 0,
      },
      breakdown: {
        byStatus: statusStats,
        byDirection: directionStats,
        byType: typeStats,
      },
      topTemplates: topTemplates.map((t) => ({
        name: t.templateName,
        count: t._count.id,
      })),
    };
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateStats(
    businessId: string,
    days: number = 30
  ): Promise<TemplateUsageStats[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const templateStats = await prisma.whatsAppMessage.groupBy({
      by: ["templateName"],
      where: {
        businessId,
        templateName: { not: null },
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      _max: { createdAt: true },
    });

    const results: TemplateUsageStats[] = [];

    for (const stat of templateStats) {
      if (!stat.templateName) continue;

      // Get success rate for this template
      const [total, successful] = await Promise.all([
        prisma.whatsAppMessage.count({
          where: {
            businessId,
            templateName: stat.templateName,
            createdAt: { gte: startDate },
          },
        }),
        prisma.whatsAppMessage.count({
          where: {
            businessId,
            templateName: stat.templateName,
            status: { in: ["sent", "delivered", "read"] },
            createdAt: { gte: startDate },
          },
        }),
      ]);

      results.push({
        templateName: stat.templateName,
        totalSent: stat._count.id,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        lastUsed: stat._max.createdAt!,
      });
    }

    return results.sort((a, b) => b.totalSent - a.totalSent);
  }

  /**
   * Get customer engagement stats
   */
  static async getCustomerEngagement(businessId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalCustomers, activeCustomers, newCustomers, responseStats] =
      await Promise.all([
        // Total unique customers
        prisma.whatsAppMessage
          .groupBy({
            by: ["customerId"],
            where: {
              businessId,
              customerId: { not: null },
            },
          })
          .then((results) => results.length),

        // Active customers (sent/received messages recently)
        prisma.whatsAppMessage
          .groupBy({
            by: ["customerId"],
            where: {
              businessId,
              customerId: { not: null },
              createdAt: { gte: startDate },
            },
          })
          .then((results) => results.length),

        // New customers (first message recently)
        prisma.whatsAppMessage
          .groupBy({
            by: ["customerId"],
            where: {
              businessId,
              customerId: { not: null },
              createdAt: { gte: startDate },
            },
            _min: { createdAt: true },
          })
          .then(
            (results) =>
              results.filter(
                (r) => r._min.createdAt && r._min.createdAt >= startDate
              ).length
          ),

        // Response statistics
        prisma.whatsAppMessage.groupBy({
          by: ["direction"],
          where: {
            businessId,
            createdAt: { gte: startDate },
          },
          _count: { id: true },
        }),
      ]);

    const responseData = responseStats.reduce((acc, item) => {
      acc[item.direction] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const incoming = responseData.INCOMING || 0;
    const outgoing = responseData.OUTGOING || 0;
    const responseRate =
      outgoing > 0 ? Math.round((incoming / outgoing) * 100) : 0;

    return {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        new: newCustomers,
      },
      engagement: {
        responseRate,
        totalInteractions: incoming + outgoing,
        averagePerCustomer:
          activeCustomers > 0
            ? Math.round((incoming + outgoing) / activeCustomers)
            : 0,
      },
    };
  }

  /**
   * Get failed messages for retry
   */
  static async getFailedMessages(businessId: string, limit: number = 20) {
    return await prisma.whatsAppMessage.findMany({
      where: {
        businessId,
        status: "failed",
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
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Retry failed message
   */
  static async retryFailedMessage(messageId: string) {
    const message = await prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      include: {
        customer: true,
      },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.status !== "failed") {
      throw new Error("Message is not in failed status");
    }

    const phoneNumber =
      message.customer?.whatsapp || message.customer?.phone || message.waId;

    if (message.templateName && message.templateData) {
      // Retry template message
      const templateParams = JSON.parse(message.templateData).parameters || [];
      return await this.sendMessage({
        businessId: message.businessId,
        customerId: message.customerId || undefined,
        orderId: message.orderId || undefined,
        phoneNumber,
        templateName: message.templateName,
        templateParams,
      });
    } else if (message.content) {
      // Retry text message
      return await this.sendMessage({
        businessId: message.businessId,
        customerId: message.customerId || undefined,
        orderId: message.orderId || undefined,
        phoneNumber,
        message: message.content,
      });
    } else {
      throw new Error(
        "Cannot retry message: no content or template data found"
      );
    }
  }

  /**
   * Clean up old messages
   */
  static async cleanupOldMessages(
    businessId: string,
    olderThanDays: number = 90
  ) {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    );

    const deletedMessages = await prisma.whatsAppMessage.deleteMany({
      where: {
        businessId,
        createdAt: { lt: cutoffDate },
        status: { in: ["delivered", "read", "failed"] }, // Keep sent messages
      },
    });

    return deletedMessages.count;
  }

  /**
   * Update message status
   */
  static async updateMessageStatus(
    businessId: string,
    messageId: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ) {
    return await prisma.whatsAppMessage.updateMany({
      where: {
        businessId,
        messageId,
      },
      data: {
        status,
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get conversation summary for customer
   */
  static async getConversationSummary(businessId: string, customerId: string) {
    const [messageCount, lastMessage, firstMessage, statusCounts] =
      await Promise.all([
        prisma.whatsAppMessage.count({
          where: { businessId, customerId },
        }),
        prisma.whatsAppMessage.findFirst({
          where: { businessId, customerId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.whatsAppMessage.findFirst({
          where: { businessId, customerId },
          orderBy: { createdAt: "asc" },
        }),
        prisma.whatsAppMessage.groupBy({
          by: ["direction", "status"],
          where: { businessId, customerId },
          _count: { id: true },
        }),
      ]);

    const stats = statusCounts.reduce((acc, item) => {
      if (!acc[item.direction]) acc[item.direction] = {};
      acc[item.direction][item.status] = item._count.id;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return {
      messageCount,
      lastActivity: lastMessage?.createdAt,
      firstContact: firstMessage?.createdAt,
      stats,
      lastMessagePreview: lastMessage?.content?.substring(0, 100),
    };
  }
}

export default WhatsAppDatabaseService;
