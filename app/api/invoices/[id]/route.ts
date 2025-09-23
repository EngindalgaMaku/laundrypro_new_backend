import { NextRequest, NextResponse } from "next/server";



import { prisma } from "@/lib/db";
const anyPrisma: any = prisma;

// GET /api/invoices/[id] - Get individual invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const { id } = await params;

  // Validation
  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json(
      { error: "Valid Business ID is required" },
      { status: 400 }
    );
  }

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Valid Invoice ID is required" },
      { status: 400 }
    );
  }

  // Basic ID format validation (should be cuid)
  if (id.length < 20 || businessId.length < 20) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    const invoice = await anyPrisma.invoice.findUnique({
      where: { id },
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
            email: true,
            phone: true,
            address: true,
            city: true,
            district: true,
            taxNumber: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if invoice belongs to the business
    if (invoice.businessId !== businessId) {
      return NextResponse.json(
        { error: "Invoice does not belong to this business" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// PATCH /api/invoices/[id] - Update invoice status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { businessId, status, paymentStatus, paymentMethod, paidAt } = body;
    const { id } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Check if invoice exists and belongs to business
    const existingInvoice = await anyPrisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existingInvoice.businessId !== businessId) {
      return NextResponse.json(
        { error: "Invoice does not belong to this business" },
        { status: 403 }
      );
    }

    // Validate status values
    const validStatuses = [
      "DRAFT",
      "SENT",
      "PAID",
      "OVERDUE",
      "CANCELLED",
      "REFUNDED",
    ];
    const validPaymentStatuses = [
      "PENDING",
      "PARTIAL",
      "PAID",
      "REFUNDED",
      "CANCELLED",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        {
          error: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Update invoice
    const updatedInvoice = await anyPrisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(paymentMethod && { paymentMethod }),
        ...(paidAt && { paidAt: new Date(paidAt) }),
        updatedAt: new Date(),
      },
      include: {
        items: true,
        business: true,
        customer: true,
        order: true,
      },
    });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: "Invoice updated successfully",
    });
  } catch (error: any) {
    console.error("Invoice update error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// DELETE /api/invoices/[id] - Delete invoice (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const { id } = await params;

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: "Invoice ID is required" },
      { status: 400 }
    );
  }

  try {
    // Check if invoice exists and belongs to business
    const existingInvoice = await anyPrisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existingInvoice.businessId !== businessId) {
      return NextResponse.json(
        { error: "Invoice does not belong to this business" },
        { status: 403 }
      );
    }

    // Only allow deletion of DRAFT invoices
    if (existingInvoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft invoices can be deleted" },
        { status: 400 }
      );
    }

    // Update invoice status to CANCELLED instead of hard delete
    const updatedInvoice = await anyPrisma.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: "Invoice cancelled successfully",
    });
  } catch (error: any) {
    console.error("Invoice deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}
