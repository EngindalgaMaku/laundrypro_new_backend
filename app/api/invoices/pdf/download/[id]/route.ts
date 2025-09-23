import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/invoices/pdf/download/[id] - Download PDF for an invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const { id: invoiceId } = await params;

  // Validation
  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json(
      { error: "Valid Business ID is required" },
      { status: 400 }
    );
  }

  if (!invoiceId || typeof invoiceId !== "string") {
    return NextResponse.json(
      { error: "Valid Invoice ID is required" },
      { status: 400 }
    );
  }

  // Basic ID format validation (should be cuid)
  if (invoiceId.length < 20 || businessId.length < 20) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  try {
    // Get invoice to verify access and get PDF URL
    const invoice = await (prisma as any).invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        businessId: true,
        pdfUrl: true,
        invoiceNumber: true,
        customerName: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if invoice belongs to the business
    if (invoice.businessId !== businessId) {
      return NextResponse.json(
        { error: "Access denied to this invoice" },
        { status: 403 }
      );
    }

    // Check if PDF exists
    if (!invoice.pdfUrl) {
      return NextResponse.json(
        {
          error: "PDF not generated yet",
          message: "Please generate the PDF first using the generate endpoint",
          generateUrl: `/api/invoices/pdf/generate`,
        },
        { status: 404 }
      );
    }

    // Construct file path
    const fileName = invoice.pdfUrl.split("/").pop();
    if (!fileName) {
      return NextResponse.json(
        { error: "Invalid PDF file path" },
        { status: 500 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "temp",
      "invoices",
      fileName
    );

    // Check if file exists on disk
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, try to regenerate or return error
      console.error("PDF file not found on disk:", filePath);
      return NextResponse.json(
        {
          error: "PDF file not found",
          message:
            "The PDF file may have been cleaned up. Please regenerate it.",
          generateUrl: `/api/invoices/pdf/generate`,
        },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);

    // Create a safe filename for download
    const safeCustomerName = invoice.customerName.replace(
      /[^a-zA-Z0-9-_\s]/g,
      ""
    );
    const downloadFileName =
      `Fatura-${invoice.invoiceNumber}-${safeCustomerName}.pdf`.replace(
        /\s+/g,
        "-"
      );

    // Return the PDF file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("PDF download error:", error);
    return NextResponse.json(
      {
        error: "Failed to download PDF",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// HEAD /api/invoices/pdf/download/[id] - Check if PDF is available for download
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const { id: invoiceId } = await params;

  if (!businessId || !invoiceId) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    // Get invoice to verify access and get PDF URL
    const invoice = await (prisma as any).invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        businessId: true,
        pdfUrl: true,
      },
    });

    if (!invoice || invoice.businessId !== businessId || !invoice.pdfUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if file exists
    const fileName = invoice.pdfUrl.split("/").pop();
    if (!fileName) {
      return new NextResponse(null, { status: 404 });
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "temp",
      "invoices",
      fileName
    );

    try {
      const stats = await fs.stat(filePath);
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": stats.size.toString(),
          "Last-Modified": stats.mtime.toUTCString(),
        },
      });
    } catch (error) {
      return new NextResponse(null, { status: 404 });
    }
  } catch (error) {
    console.error("PDF HEAD request error:", error);
    return new NextResponse(null, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
