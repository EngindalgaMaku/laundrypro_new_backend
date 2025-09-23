import { NextRequest, NextResponse } from "next/server";

import { getPlanForBusiness } from "@/lib/entitlements";
import { GIBPortalService } from "@/lib/e-fatura/gib-portal-service";



import { prisma } from "@/lib/db";
// Get invoice status from GIB Portal
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const businessId = searchParams.get("businessId");
  const sync = searchParams.get("sync") === "true"; // Whether to sync from GIB Portal

  if (!invoiceId || !businessId) {
    return NextResponse.json(
      { error: "Invoice ID and Business ID are required" },
      { status: 400 }
    );
  }

  try {
    // Plan gate
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura durumu sorgulamak için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    // Get invoice details
    const invoice = await prisma.eInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.businessId !== businessId) {
      return NextResponse.json(
        { error: "Invoice does not belong to this business" },
        { status: 403 }
      );
    }

    // If sync is requested and invoice has UUID, query GIB Portal
    if (sync && invoice.invoiceUuid) {
      await syncInvoiceStatusFromGIB(invoiceId, businessId);

      // Reload invoice with updated status
      const updatedInvoice = await prisma.eInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          logs: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      return NextResponse.json({
        success: true,
        invoice: updatedInvoice,
        synced: true,
      });
    }

    return NextResponse.json({
      success: true,
      invoice,
      synced: false,
    });
  } catch (error: any) {
    console.error("Invoice status error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// Update invoice status manually
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, businessId, status, errorCode, errorMessage } = body;

    if (!invoiceId || !businessId || !status) {
      return NextResponse.json(
        { error: "Invoice ID, Business ID, and status are required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = [
      "DRAFT",
      "CREATED",
      "SIGNED",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "CANCELLED",
      "ARCHIVED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if invoice exists and belongs to business
    const existingInvoice = await prisma.eInvoice.findUnique({
      where: { id: invoiceId },
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

    // Update invoice status
    const updatedInvoice = await prisma.eInvoice.update({
      where: { id: invoiceId },
      data: {
        gibStatus: status as any,
        gibStatusDate: new Date(),
        ...(errorCode && { gibErrorCode: errorCode }),
        ...(errorMessage && { gibErrorMessage: errorMessage }),
        updatedAt: new Date(),
      },
    });

    // Log the status update
    await prisma.eInvoiceLog.create({
      data: {
        eInvoiceId: invoiceId,
        action: "STATUS_UPDATE",
        status: "SUCCESS",
        requestData: JSON.stringify({ status, errorCode, errorMessage }),
        responseData: JSON.stringify({
          oldStatus: existingInvoice.gibStatus,
          newStatus: status,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: "Invoice status updated successfully",
    });
  } catch (error: any) {
    console.error("Invoice status update error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// Sync invoice status from GIB Portal
async function syncInvoiceStatusFromGIB(
  invoiceId: string,
  businessId: string
): Promise<void> {
  try {
    // Get invoice and settings
    const [invoice, eInvoiceSettings] = await Promise.all([
      prisma.eInvoice.findUnique({ where: { id: invoiceId } }),
      prisma.eInvoiceSettings.findUnique({ where: { businessId } }),
    ]);

    if (!invoice || !eInvoiceSettings || !invoice.invoiceUuid) {
      throw new Error("Invoice or settings not found");
    }

    // Initialize GIB Portal Service
    const gibService = new GIBPortalService({
      username: eInvoiceSettings.gibUsername || "",
      password: await decryptPassword(eInvoiceSettings.gibPassword || ""),
      testMode: eInvoiceSettings.gibTestMode,
      portalUrl: eInvoiceSettings.gibPortalUrl,
    });

    // Query status from GIB Portal
    const statusResult = await gibService.queryInvoiceStatus(
      invoice.invoiceUuid
    );

    if (statusResult) {
      // Update invoice with GIB status
      await prisma.eInvoice.update({
        where: { id: invoiceId },
        data: {
          gibStatus: statusResult.status,
          gibStatusDate: statusResult.statusDate,
          gibErrorCode: statusResult.errorCode,
          gibErrorMessage: statusResult.errorMessage,
          updatedAt: new Date(),
        },
      });

      // Log the sync
      await prisma.eInvoiceLog.create({
        data: {
          eInvoiceId: invoiceId,
          action: "QUERY_STATUS",
          status: "SUCCESS",
          requestData: JSON.stringify({ invoiceUuid: invoice.invoiceUuid }),
          responseData: JSON.stringify(statusResult),
        },
      });
    }
  } catch (error: any) {
    console.error("Error syncing invoice status:", error);

    // Log the failed sync
    await prisma.eInvoiceLog
      .create({
        data: {
          eInvoiceId: invoiceId,
          action: "QUERY_STATUS",
          status: "FAILED",
          errorMessage: error.message,
        },
      })
      .catch(console.error);
  }
}

// Decrypt password (simple base64 decode - replace with proper decryption in production)
async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    return Buffer.from(encryptedPassword, "base64").toString("utf8");
  } catch {
    return encryptedPassword; // Return as-is if decryption fails
  }
}

// Bulk sync invoice statuses
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, invoiceIds } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Plan gate
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura toplu durum senkronizasyonu için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    let invoicesToSync;

    if (invoiceIds && Array.isArray(invoiceIds)) {
      // Sync specific invoices
      invoicesToSync = await prisma.eInvoice.findMany({
        where: {
          id: { in: invoiceIds },
          businessId,
          invoiceUuid: { not: null },
          gibStatus: { in: ["SENT", "ACCEPTED", "REJECTED"] },
        },
      });
    } else {
      // Sync all pending invoices for the business
      invoicesToSync = await prisma.eInvoice.findMany({
        where: {
          businessId,
          invoiceUuid: { not: null },
          gibStatus: "SENT", // Only sync invoices that were sent but haven't been updated
        },
        take: 50, // Limit to avoid overwhelming the system
      });
    }

    const results = [];
    const errors = [];

    for (const invoice of invoicesToSync) {
      try {
        await syncInvoiceStatusFromGIB(invoice.id, businessId);
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: true,
        });
      } catch (error: any) {
        errors.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: invoicesToSync.length,
        synced: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Bulk invoice sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}
