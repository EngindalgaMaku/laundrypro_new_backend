import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getPlanForBusiness } from "@/lib/entitlements";
import {
  UBLXMLGenerator,
  EInvoiceData,
} from "@/lib/e-fatura/ubl-xml-generator";
import { getVATRateForService } from "@/lib/e-fatura/ubl-xml-generator";

const prisma = new PrismaClient();

// Helper function to use any Prisma methods (bypassing TypeScript issues)
const anyPrisma: any = prisma;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      businessId,
      customerVknTckn,
      autoSend = false,
      createEInvoice = false, // New parameter to distinguish e-invoice creation
    } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // If no orderId is provided, we can't create invoice from order
    if (!orderId) {
      return NextResponse.json(
        {
          error: "Order ID is required for invoice creation",
          message:
            "To create an invoice, please select a completed order from the orders list and use the 'Create Invoice' option.",
        },
        { status: 400 }
      );
    }

    // Get plan for business
    const plan = await getPlanForBusiness(businessId);

    // Plan gate: require PRO only for e-Fatura (GIB integration)
    if (createEInvoice && plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura oluşturmak için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    // For basic invoices, all plans are allowed
    if (!createEInvoice) {
      return await createBasicInvoice(orderId, businessId, customerVknTckn);
    }

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
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get E-Invoice settings
    const eInvoiceSettings = await prisma.eInvoiceSettings.findUnique({
      where: { businessId },
    });

    if (!eInvoiceSettings || !eInvoiceSettings.isEnabled) {
      return NextResponse.json(
        { error: "E-Invoice not configured for this business" },
        { status: 400 }
      );
    }

    // Check if invoice already exists for this order
    const existingInvoice = await prisma.eInvoice.findFirst({
      where: { orderId },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Invoice already exists for this order" },
        { status: 400 }
      );
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(businessId);

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
      include: {
        items: true,
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

    // Auto-send if requested
    if (autoSend) {
      // TODO: Implement auto-send functionality
      // This would call the send endpoint
    }

    return NextResponse.json({
      success: true,
      invoice: eInvoice,
      message: "E-Invoice created successfully",
    });
  } catch (error: any) {
    console.error("E-Invoice creation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Generate sequential invoice number
async function generateInvoiceNumber(businessId: string): Promise<string> {
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

// Create basic invoice (without GIB integration)
async function createBasicInvoice(
  orderId: string,
  businessId: string,
  customerVknTckn?: string
) {
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
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check if basic invoice already exists for this order
  const existingInvoice = await anyPrisma.invoice.findFirst({
    where: { orderId },
  });

  if (existingInvoice) {
    return NextResponse.json(
      { error: "Invoice already exists for this order" },
      { status: 400 }
    );
  }

  // Generate basic invoice number
  const invoiceNumber = await generateBasicInvoiceNumber(businessId);

  // Create basic invoice
  const invoice = await anyPrisma.invoice.create({
    data: {
      businessId,
      orderId,
      invoiceNumber,
      invoiceDate: new Date(),
      status: "DRAFT",
      customerId: order.customerId,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      customerPhone: order.customer.phone,
      customerEmail: order.customer.email,
      customerAddress: order.customer.address,
      customerVknTckn: customerVknTckn || order.customerVknTckn,
      currencyCode: "TRY",
      subtotalAmount: order.subtotal,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
    },
    include: {
      items: true,
    },
  });

  // Create invoice items
  await anyPrisma.invoiceItem.createMany({
    data: order.orderItems.map((item) => ({
      invoiceId: invoice.id,
      orderItemId: item.id,
      name: item.service.name,
      description: item.service.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineAmount: item.totalPrice,
      taxRate: item.vatRate || 0,
      taxAmount: item.vatAmount || 0,
      lineTotal:
        parseFloat(item.totalPrice.toString()) +
        parseFloat((item.vatAmount || 0).toString()),
    })),
  });

  // Get the complete invoice with items
  const completeInvoice = await anyPrisma.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      items: true,
      business: true,
      customer: true,
      order: true,
    },
  });

  return NextResponse.json({
    success: true,
    invoice: completeInvoice,
    message: "Basic invoice created successfully",
  });
}

// Generate basic invoice number
async function generateBasicInvoiceNumber(businessId: string): Promise<string> {
  // Get the latest invoice number for this business
  const lastInvoice = await anyPrisma.invoice.findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (lastInvoice?.invoiceNumber) {
    // Extract number from invoice number (assuming format like "INV2024001")
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  const year = new Date().getFullYear();
  const paddedNumber = nextNumber.toString().padStart(6, "0");

  return `INV${year}${paddedNumber}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const orderId = searchParams.get("orderId");
  const type = searchParams.get("type") || "basic"; // "basic" or "einvoice"

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    const where: any = { businessId };
    if (orderId) {
      where.orderId = orderId;
    }

    if (type === "einvoice") {
      // Fetch e-invoices (existing functionality)
      const eInvoices = await prisma.eInvoice.findMany({
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
                },
              },
            },
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        invoices: eInvoices,
        type: "einvoice",
      });
    } else {
      // Fetch basic invoices (new functionality)
      const basicInvoices = await anyPrisma.invoice.findMany({
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
                },
              },
            },
          },
          business: {
            select: {
              name: true,
            },
          },
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        invoices: basicInvoices,
        type: "basic",
      });
    }
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
