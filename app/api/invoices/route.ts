import { NextRequest, NextResponse } from "next/server";



import { prisma } from "@/lib/db";
const anyPrisma: any = prisma;

// GET /api/invoices - List basic invoices
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const orderId = searchParams.get("orderId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  // Basic ID format validation (should be cuid - at least 20 characters)
  if (businessId.length < 20) {
    return NextResponse.json(
      { error: "Invalid Business ID format" },
      { status: 400 }
    );
  }

  try {
    const where: any = { businessId };
    if (orderId) {
      where.orderId = orderId;
    }

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
  } catch (error: any) {
    console.error("Error fetching basic invoices:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// POST /api/invoices - Create basic invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, businessId, customerVknTckn } = body;

    // Validation
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Valid Order ID is required" },
        { status: 400 }
      );
    }

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json(
        { error: "Valid Business ID is required" },
        { status: 400 }
      );
    }

    // Optional validation for customerVknTckn format
    if (customerVknTckn && typeof customerVknTckn === "string") {
      const vknPattern = /^\d{10,11}$/; // 10 or 11 digits
      if (!vknPattern.test(customerVknTckn)) {
        return NextResponse.json(
          { error: "Customer VKN/TCKN must be 10 or 11 digits" },
          { status: 400 }
        );
      }
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
  } catch (error: any) {
    console.error("Basic invoice creation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

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
