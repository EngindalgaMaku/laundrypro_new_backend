import { NextRequest, NextResponse } from "next/server";

import { getPlanForBusiness } from "@/lib/entitlements";
import { GIBPortalService } from "@/lib/e-fatura/gib-portal-service";



import { prisma } from "@/lib/db";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, businessId, reason } = body;

    if (!invoiceId || !businessId || !reason) {
      return NextResponse.json(
        {
          error:
            "Invoice ID, Business ID, and cancellation reason are required",
        },
        { status: 400 }
      );
    }

    // Plan gate: require PRO
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura iptali için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    // Get invoice details
    const invoice = await prisma.eInvoice.findUnique({
      where: { id: invoiceId },
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

    // Check if invoice can be cancelled
    if (!["SENT", "ACCEPTED"].includes(invoice.gibStatus)) {
      return NextResponse.json(
        {
          error: `Invoice with status ${invoice.gibStatus} cannot be cancelled`,
        },
        { status: 400 }
      );
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

    let cancelResult = { success: false, error: "GIB Portal not configured" };

    // Try to cancel in GIB Portal if invoice was sent
    if (invoice.invoiceUuid && invoice.gibStatus === "SENT") {
      try {
        const gibService = new GIBPortalService({
          username: eInvoiceSettings.gibUsername || "",
          password: await decryptPassword(eInvoiceSettings.gibPassword || ""),
          testMode: eInvoiceSettings.gibTestMode,
          portalUrl: eInvoiceSettings.gibPortalUrl,
        });

        const gibCancelResult = await gibService.cancelInvoice(
          invoice.invoiceUuid,
          reason
        );

        cancelResult = {
          success: gibCancelResult,
          error: gibCancelResult ? "" : "GIB Portal cancellation failed",
        };
      } catch (error: any) {
        console.error("GIB Portal cancellation error:", error);
        cancelResult = {
          success: false,
          error: error.message,
        };
      }
    } else {
      // For local invoices or draft invoices, allow direct cancellation
      cancelResult = { success: true, error: "" };
    }

    // Update invoice status
    const updatedInvoice = await prisma.eInvoice.update({
      where: { id: invoiceId },
      data: {
        gibStatus: "CANCELLED",
        gibStatusDate: new Date(),
        gibErrorMessage: reason,
        updatedAt: new Date(),
      },
    });

    // Log the cancellation attempt
    await prisma.eInvoiceLog.create({
      data: {
        eInvoiceId: invoiceId,
        action: "CANCEL",
        status: cancelResult.success ? "SUCCESS" : "FAILED",
        requestData: JSON.stringify({ reason }),
        responseData: JSON.stringify(cancelResult),
        errorMessage: cancelResult.error,
      },
    });

    if (cancelResult.success || invoice.gibStatus !== "SENT") {
      return NextResponse.json({
        success: true,
        invoice: updatedInvoice,
        message: "Invoice cancelled successfully",
        gibCancelled: cancelResult.success,
      });
    } else {
      return NextResponse.json(
        {
          error: "Failed to cancel invoice in GIB Portal",
          details: cancelResult.error,
          localCancellation: true,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Invoice cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// Bulk cancel invoices
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceIds, businessId, reason } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Invoice IDs array is required" },
        { status: 400 }
      );
    }

    if (!businessId || !reason) {
      return NextResponse.json(
        { error: "Business ID and cancellation reason are required" },
        { status: 400 }
      );
    }

    // Plan gate: require PRO
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura iptali için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    const results = [];
    const errors = [];

    // Process each invoice
    for (const invoiceId of invoiceIds) {
      try {
        const cancelResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ invoiceId, businessId, reason }),
          }
        );

        const result = await cancelResponse.json();

        if (result.success) {
          results.push({
            invoiceId,
            success: true,
            gibCancelled: result.gibCancelled,
          });
        } else {
          errors.push({
            invoiceId,
            error: result.error,
            details: result.details,
          });
        }
      } catch (error: any) {
        errors.push({
          invoiceId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: invoiceIds.length,
        cancelled: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Bulk invoice cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Decrypt password (simple base64 decode - replace with proper decryption in production)
async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    return Buffer.from(encryptedPassword, "base64").toString("utf8");
  } catch {
    return encryptedPassword; // Return as-is if decryption fails
  }
}
