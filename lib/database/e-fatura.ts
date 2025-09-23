import { PrismaClient } from "@prisma/client";
import {
  UBLXMLGenerator,
  EInvoiceData,
} from "@/lib/e-fatura/ubl-xml-generator";
import { getVATRateForService } from "@/lib/e-fatura/ubl-xml-generator";

const prisma = new PrismaClient();

export interface CreateEInvoiceRequest {
  businessId: string;
  orderId: string;
  customerVknTckn?: string;
  autoSend?: boolean;
}

export interface EInvoiceFilters {
  businessId: string;
  status?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  customerId?: string;
  orderId?: string;
  invoiceNumber?: string;
}

export class EFaturaService {
  /**
   * Create an e-invoice from an order
   */
  static async createInvoiceFromOrder(request: CreateEInvoiceRequest) {
    const { businessId, orderId, customerVknTckn, autoSend = false } = request;

    // Get order with all necessary relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        business: true,
        orderItems: {
          include: {
            service: true,
            servicePricing: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Get E-Invoice settings
    const eInvoiceSettings = await prisma.eInvoiceSettings.findUnique({
      where: { businessId },
    });

    if (!eInvoiceSettings || !eInvoiceSettings.isEnabled) {
      throw new Error("E-Invoice not configured for this business");
    }

    // Check if invoice already exists for this order
    const existingInvoice = await prisma.eInvoice.findFirst({
      where: { orderId },
    });

    if (existingInvoice) {
      throw new Error("Invoice already exists for this order");
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(businessId);

    // Prepare invoice data
    const invoiceData: EInvoiceData = {
      invoiceNumber,
      invoiceDate: new Date(),
      invoiceTime: new Date(),
      invoiceType: "SATIS",
      currencyCode: "TRY",
      supplier: {
        vkn: eInvoiceSettings.companyVkn || "",
        title: eInvoiceSettings.companyTitle || order.business.name,
        address:
          eInvoiceSettings.companyAddress || order.business.address || "",
        district:
          eInvoiceSettings.companyDistrict || order.business.district || "",
        city: eInvoiceSettings.companyCity || order.business.city || "",
        country: eInvoiceSettings.companyCountry,
        postalCode: eInvoiceSettings.companyPostalCode ?? undefined,
        email:
          eInvoiceSettings.companyEmail ?? order.business.email ?? undefined,
        phone:
          eInvoiceSettings.companyPhone ?? order.business.phone ?? undefined,
        website: eInvoiceSettings.companyWebsite ?? undefined,
      },
      customer: {
        vknTckn: customerVknTckn || order.customerVknTckn || "11111111111", // Default TCKN
        title: `${order.customer.firstName} ${order.customer.lastName}`,
        address: order.customer.address || "No address",
        district: order.customer.district || "Unknown",
        city: order.customer.city || "Unknown",
        country: "Türkiye",
        email: order.customer.email ?? undefined,
        phone: order.customer.phone,
      },
      invoiceLines: order.orderItems.map((item, index) => {
        const vatRate = getVATRateForService(item.service.category);
        const vatAmount =
          (parseFloat(item.totalPrice.toString()) * vatRate) / 100;

        return {
          id: (index + 1).toString(),
          name: item.service.name,
          description: item.service.description ?? undefined,
          quantity: parseFloat(item.quantity.toString()),
          unitCode: "C62", // Piece
          unitPrice: parseFloat(item.unitPrice.toString()),
          lineAmount: parseFloat(item.totalPrice.toString()),
          vatRate,
          vatAmount,
          lineTotal: parseFloat(item.totalPrice.toString()) + vatAmount,
        };
      }),
      subtotalAmount: parseFloat(order.subtotal.toString()),
      totalVatAmount: parseFloat(order.taxAmount.toString()),
      totalAmount: parseFloat(order.totalAmount.toString()),
      payableAmount: parseFloat(order.totalAmount.toString()),
    };

    // Generate UBL XML
    const ublXmlContent = UBLXMLGenerator.generateInvoiceXML(invoiceData);

    // Create invoice record
    const eInvoice = await prisma.eInvoice.create({
      data: {
        businessId,
        orderId,
        invoiceNumber,
        invoiceSeriesId: eInvoiceSettings.invoiceSeriesPrefix,
        invoiceDate: invoiceData.invoiceDate,
        invoiceTime: invoiceData.invoiceTime,
        buyerVknTckn: invoiceData.customer.vknTckn,
        buyerTitle: invoiceData.customer.title,
        buyerAddress: invoiceData.customer.address,
        buyerDistrict: invoiceData.customer.district,
        buyerCity: invoiceData.customer.city,
        buyerCountry: invoiceData.customer.country,
        buyerEmail: invoiceData.customer.email,
        buyerPhone: invoiceData.customer.phone,
        currencyCode: invoiceData.currencyCode,
        subtotalAmount: invoiceData.subtotalAmount,
        vatAmount: invoiceData.totalVatAmount,
        totalAmount: invoiceData.totalAmount,
        payableAmount: invoiceData.payableAmount,
        ublXmlContent,
        gibStatus: "CREATED",
      },
    });

    // Create invoice items
    await prisma.eInvoiceItem.createMany({
      data: invoiceData.invoiceLines.map((line, index) => ({
        eInvoiceId: eInvoice.id,
        orderItemId: order.orderItems[index]?.id,
        itemName: line.name,
        itemDescription: line.description,
        quantity: line.quantity,
        unitCode: line.unitCode,
        unitPrice: line.unitPrice,
        lineAmount: line.lineAmount,
        vatRate: line.vatRate,
        vatAmount: line.vatAmount,
        lineTotal: line.lineTotal,
      })),
    });

    // Log creation
    await prisma.eInvoiceLog.create({
      data: {
        eInvoiceId: eInvoice.id,
        action: "CREATE",
        status: "SUCCESS",
        requestData: JSON.stringify(invoiceData),
      },
    });

    return eInvoice;
  }

  /**
   * Get invoices with filters
   */
  static async getInvoices(
    filters: EInvoiceFilters,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {
      businessId: filters.businessId,
    };

    if (filters.status && filters.status.length > 0) {
      where.gibStatus = { in: filters.status };
    }

    if (filters.dateRange) {
      where.invoiceDate = {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate,
      };
    }

    if (filters.customerId) {
      where.order = { customerId: filters.customerId };
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters.invoiceNumber) {
      where.invoiceNumber = { contains: filters.invoiceNumber };
    }

    const [invoices, total] = await Promise.all([
      prisma.eInvoice.findMany({
        where,
        include: {
          items: true,
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.eInvoice.count({ where }),
    ]);

    return { invoices, total };
  }

  /**
   * Get invoice statistics for a business
   */
  static async getInvoiceStats(businessId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalCount, recentCount, statusCounts, totalAmount, recentAmount] =
      await Promise.all([
        prisma.eInvoice.count({
          where: { businessId },
        }),
        prisma.eInvoice.count({
          where: {
            businessId,
            createdAt: { gte: startDate },
          },
        }),
        prisma.eInvoice.groupBy({
          by: ["gibStatus"],
          where: { businessId },
          _count: { id: true },
        }),
        prisma.eInvoice.aggregate({
          where: { businessId },
          _sum: { totalAmount: true },
        }),
        prisma.eInvoice.aggregate({
          where: {
            businessId,
            createdAt: { gte: startDate },
          },
          _sum: { totalAmount: true },
        }),
      ]);

    const statusStats = statusCounts.reduce((acc, item) => {
      acc[item.gibStatus] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: {
        count: totalCount,
        amount: totalAmount._sum.totalAmount || 0,
      },
      recent: {
        count: recentCount,
        amount: recentAmount._sum.totalAmount || 0,
        days,
      },
      byStatus: statusStats,
    };
  }

  /**
   * Generate sequential invoice number
   */
  private static async generateInvoiceNumber(
    businessId: string
  ): Promise<string> {
    const settings = await prisma.eInvoiceSettings.findUnique({
      where: { businessId },
    });

    if (!settings) {
      throw new Error("E-Invoice settings not found");
    }

    // Update and get next invoice number
    const updatedSettings = await prisma.eInvoiceSettings.update({
      where: { businessId },
      data: {
        currentInvoiceNumber: {
          increment: 1,
        },
      },
    });

    const paddedNumber = updatedSettings.currentInvoiceNumber
      .toString()
      .padStart(settings.invoiceNumberLength, "0");

    return `${
      settings.invoiceSeriesPrefix
    }${new Date().getFullYear()}${paddedNumber}`;
  }

  /**
   * Check if order is eligible for e-invoice
   */
  static async isOrderEligibleForInvoice(orderId: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: {
          include: {
            eInvoiceSettings: true,
          },
        },
      },
    });

    if (!order) {
      return { eligible: false, reason: "Order not found" };
    }

    if (!order.business.eInvoiceSettings?.isEnabled) {
      return { eligible: false, reason: "E-Invoice not enabled for business" };
    }

    if (!order.requiresInvoice) {
      return {
        eligible: false,
        reason: "Order marked as not requiring invoice",
      };
    }

    if (
      order.paymentStatus !== "PAID" &&
      order.business.eInvoiceSettings.invoiceOnPayment
    ) {
      return { eligible: false, reason: "Payment not completed" };
    }

    if (
      order.status !== "COMPLETED" &&
      order.business.eInvoiceSettings.invoiceOnOrderComplete
    ) {
      return { eligible: false, reason: "Order not completed" };
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.eInvoice.findFirst({
      where: { orderId },
    });

    if (existingInvoice) {
      return { eligible: false, reason: "Invoice already exists" };
    }

    return { eligible: true };
  }

  /**
   * Get pending invoices for auto-processing
   */
  static async getPendingInvoices(businessId: string, limit: number = 10) {
    return await prisma.eInvoice.findMany({
      where: {
        businessId,
        gibStatus: "CREATED",
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Clean up old draft invoices
   */
  static async cleanupDraftInvoices(
    businessId: string,
    olderThanDays: number = 7
  ) {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    );

    const deletedInvoices = await prisma.eInvoice.deleteMany({
      where: {
        businessId,
        gibStatus: "DRAFT",
        createdAt: { lt: cutoffDate },
      },
    });

    return deletedInvoices.count;
  }
}

export default EFaturaService;
