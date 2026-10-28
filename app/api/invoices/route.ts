import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { buildInvoiceLines, vatSettingsOf } from "@/lib/vat";
const anyPrisma: any = prisma;

// GET /api/invoices - List basic invoices
async function getHandler(
  request: NextRequest,
  authData: { user: any; business?: any }
) {
  const { user } = authData;

  if (!user.businessId) {
    return NextResponse.json(
      { error: "User has no business associated" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  // SECURITY FIX: Always use businessId from authenticated token ONLY
  const businessId = user.businessId;
  const orderId = searchParams.get("orderId");

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
  }
}

export const GET = withAuth(getHandler);

// POST /api/invoices - Create basic invoice
async function postHandler(
  request: NextRequest,
  authData: { user: any; business?: any }
) {
  const { user } = authData;

  try {
    const body = await request.json();
    const { orderId, customerVknTckn } = body;

    // Use businessId from authenticated user
    const businessId = user.businessId;

    if (!businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    // Validation
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Valid Order ID is required" },
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
    // Only the caller's own orders can be invoiced
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
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

    // VAT from the business setting (Settings > İşletme)
    const invoiceLines = buildInvoiceLines(order, vatSettingsOf(order.business));

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
        subtotalAmount: invoiceLines.subtotal,
        taxAmount: invoiceLines.vatTotal,
        totalAmount: invoiceLines.total,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
      include: {
        items: true,
      },
    });

    // Create invoice items
    await anyPrisma.invoiceItem.createMany({
      data: invoiceLines.lines.map((line) => ({
        invoiceId: invoice.id,
        orderItemId: line.orderItemId,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineAmount: line.lineAmount,
        taxRate: line.vatRate,
        taxAmount: line.vatAmount,
        lineTotal: line.lineTotal,
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
  }
}

export const POST = withAuth(postHandler);

// Generate basic invoice number: INV + year + 6-digit sequence, per business,
// restarting each year (INV2026000001)
async function generateBasicInvoiceNumber(businessId: string): Promise<string> {
  const prefix = `INV${new Date().getFullYear()}`;

  // Fixed-width numbers sort correctly as strings
  const lastInvoice = await anyPrisma.invoice.findFirst({
    where: { businessId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });

  let nextNumber = 1;
  const sequence = lastInvoice?.invoiceNumber.slice(prefix.length);
  if (sequence && /^\d{6}$/.test(sequence)) {
    nextNumber = parseInt(sequence, 10) + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(6, "0")}`;
}
