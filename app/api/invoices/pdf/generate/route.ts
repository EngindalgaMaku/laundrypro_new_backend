import { NextRequest, NextResponse } from "next/server";
import { PDFService } from "../../../../../lib/pdf-service";

// POST /api/invoices/pdf/generate - Generate PDF for an invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, businessId } = body;

    // Validation
    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json(
        { error: "Valid Invoice ID is required" },
        { status: 400 }
      );
    }

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json(
        { error: "Valid Business ID is required" },
        { status: 400 }
      );
    }

    // Basic ID format validation (should be cuid)
    if (invoiceId.length < 20 || businessId.length < 20) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Generate PDF
    console.log(
      `Generating PDF for invoice ${invoiceId} for business ${businessId}`
    );

    const pdfPath = await PDFService.generateInvoicePDF(invoiceId, businessId);

    // Extract filename from path
    const fileName = pdfPath.split("/").pop() || "invoice.pdf";

    return NextResponse.json({
      success: true,
      message: "PDF generated successfully",
      pdfUrl: `/temp/invoices/${fileName}`,
      fileName: fileName,
      downloadUrl: `/api/invoices/pdf/download/${invoiceId}?businessId=${businessId}`,
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);

    // Handle specific error cases
    if (error.message === "Invoice not found") {
      return NextResponse.json(
        { error: "Invoice not found or access denied" },
        { status: 404 }
      );
    }

    if (
      error.message.includes("Permission denied") ||
      error.message.includes("access denied")
    ) {
      return NextResponse.json(
        { error: "Access denied to this invoice" },
        { status: 403 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// GET /api/invoices/pdf/generate - Get generation status (optional endpoint)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const businessId = searchParams.get("businessId");

  if (!invoiceId || !businessId) {
    return NextResponse.json(
      { error: "Invoice ID and Business ID are required" },
      { status: 400 }
    );
  }

  try {
    // Check if PDF already exists for this invoice
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const invoice = await (prisma as any).invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        businessId: true,
        pdfUrl: true,
        invoiceNumber: true,
        updatedAt: true,
      },
    });

    if (!invoice || invoice.businessId !== businessId) {
      return NextResponse.json(
        { error: "Invoice not found or access denied" },
        { status: 404 }
      );
    }

    const hasPDF = !!invoice.pdfUrl;
    const fileName = invoice.pdfUrl ? invoice.pdfUrl.split("/").pop() : null;

    return NextResponse.json({
      success: true,
      hasPDF,
      pdfUrl: invoice.pdfUrl,
      fileName,
      downloadUrl: hasPDF
        ? `/api/invoices/pdf/download/${invoiceId}?businessId=${businessId}`
        : null,
      lastUpdated: invoice.updatedAt,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error: any) {
    console.error("PDF status check error:", error);
    return NextResponse.json(
      { error: "Failed to check PDF status" },
      { status: 500 }
    );
  }
}
