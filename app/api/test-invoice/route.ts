import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("Testing basic invoice creation...");

    // Test if we can access the invoice model
    console.log("Available Prisma models:", Object.keys(prisma));

    // Get any available business for testing
    const business = await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json(
        { error: "No business found for testing" },
        { status: 404 }
      );
    }

    // Get any available order for testing
    const order = await prisma.order.findFirst({
      where: { businessId: business.id },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "No order found for testing" },
        { status: 404 }
      );
    }

    // Try to create a basic invoice
    const anyPrisma: any = prisma;

    const testInvoice = await anyPrisma.invoice.create({
      data: {
        businessId: business.id,
        orderId: order.id,
        invoiceNumber: `TEST${Date.now()}`,
        invoiceDate: new Date(),
        status: "DRAFT",
        customerId: order.customerId,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email,
        customerAddress: order.customer.address,
        currencyCode: "TRY",
        subtotalAmount: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
    });

    // Test invoice items creation
    if (order.orderItems.length > 0) {
      await anyPrisma.invoiceItem.createMany({
        data: order.orderItems.map((item) => ({
          invoiceId: testInvoice.id,
          orderItemId: item.id,
          name: item.service.name,
          description: item.service.description || "",
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
    }

    // Get complete invoice with items
    const completeInvoice = await anyPrisma.invoice.findUnique({
      where: { id: testInvoice.id },
      include: {
        items: true,
        business: true,
        customer: true,
        order: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Basic invoice test successful!",
      testInvoice: completeInvoice,
      models: Object.keys(prisma),
    });
  } catch (error: any) {
    console.error("Invoice test error:", error);
    return NextResponse.json(
      {
        error: "Invoice test failed",
        details: error.message,
        models: Object.keys(prisma),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  try {
    const anyPrisma: any = prisma;

    // Test basic invoice listing
    const invoices = await anyPrisma.invoice.findMany({
      take: 5,
      include: {
        items: true,
        business: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice listing test successful!",
      invoices,
      count: invoices.length,
    });
  } catch (error: any) {
    console.error("Invoice listing test error:", error);
    return NextResponse.json(
      {
        error: "Invoice listing test failed",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
