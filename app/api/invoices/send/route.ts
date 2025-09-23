import { NextRequest, NextResponse } from "next/server";

import { getPlanForBusiness } from "@/lib/entitlements";
import { GIBPortalService } from "@/lib/e-fatura/gib-portal-service";



import { prisma } from "@/lib/db";
export async function POST(request: NextRequest) {
  let invoiceId: string | undefined;

  try {
    const body = await request.json();
    const { invoiceId: bodyInvoiceId, businessId } = body;
    invoiceId = bodyInvoiceId;

    if (!invoiceId || !businessId) {
      return NextResponse.json(
        { error: "Invoice ID and Business ID are required" },
        { status: 400 }
      );
    }

    // Plan gate: require PRO for e-Fatura send
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura göndermek için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    // Get invoice details
    const invoice = await prisma.eInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        business: true,
        items: true,
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

    // Check if invoice is already sent
    if (invoice.gibStatus !== "CREATED" && invoice.gibStatus !== "DRAFT") {
      return NextResponse.json(
        { error: `Invoice already ${invoice.gibStatus.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Initialize GIB Portal Service
    const gibService = new GIBPortalService(
      {
        username: eInvoiceSettings.gibUsername || "",
        password: await decryptPassword(eInvoiceSettings.gibPassword || ""),
        testMode: eInvoiceSettings.gibTestMode,
        portalUrl: eInvoiceSettings.gibPortalUrl,
      },
      eInvoiceSettings.certificatePath
        ? {
            certificatePath: eInvoiceSettings.certificatePath,
            certificatePassword: await decryptPassword(
              eInvoiceSettings.certificatePassword || ""
            ),
          }
        : undefined
    );

    // Sign XML content if certificate is available
    let signedXmlContent = invoice.ublXmlContent || "";
    if (eInvoiceSettings.certificatePath && invoice.ublXmlContent) {
      try {
        signedXmlContent = await gibService.signXMLContent(
          invoice.ublXmlContent
        );
      } catch (signError) {
        console.error("XML signing failed:", signError);
        // Continue with unsigned content for testing
      }
    }

    // Generate ETTN if not exists
    let ettn = invoice.ettn;
    if (!ettn) {
      ettn = generateETTN();

      await prisma.eInvoice.update({
        where: { id: invoiceId },
        data: { ettn },
      });
    }

    // Send invoice to GIB Portal
    const sendResult = await gibService.sendInvoice({
      invoiceUuid: invoice.invoiceUuid || generateUUID(),
      invoiceNumber: invoice.invoiceNumber,
      ettn,
      signedXmlContent,
      receiverIdentifier: invoice.buyerVknTckn,
    });

    // Log the send attempt
    await prisma.eInvoiceLog.create({
      data: {
        eInvoiceId: invoiceId,
        action: "SEND",
        status: sendResult.success ? "SUCCESS" : "FAILED",
        requestData: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          ettn,
          receiverIdentifier: invoice.buyerVknTckn,
        }),
        responseData: JSON.stringify(sendResult),
        errorCode: sendResult.errorCode,
        errorMessage: sendResult.errorMessage,
        gibTransactionId: sendResult.transactionId,
      },
    });

    if (sendResult.success) {
      // Update invoice status
      const updatedInvoice = await prisma.eInvoice.update({
        where: { id: invoiceId },
        data: {
          gibStatus: "SENT",
          gibStatusDate: new Date(),
          signedXmlContent,
          sentAt: new Date(),
          ...(sendResult.invoiceUuid && {
            invoiceUuid: sendResult.invoiceUuid,
          }),
          ...(ettn && { ettn }),
        },
      });

      return NextResponse.json({
        success: true,
        invoice: updatedInvoice,
        transactionId: sendResult.transactionId,
        message: "Invoice sent to GIB successfully",
      });
    } else {
      // Update invoice with error status
      await prisma.eInvoice.update({
        where: { id: invoiceId },
        data: {
          gibStatus: "REJECTED",
          gibStatusDate: new Date(),
          gibErrorCode: sendResult.errorCode,
          gibErrorMessage: sendResult.errorMessage,
        },
      });

      return NextResponse.json(
        {
          error: "Failed to send invoice to GIB",
          details: sendResult.errorMessage,
          errorCode: sendResult.errorCode,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Invoice send error:", error);

    // Log failed send attempt
    if (invoiceId) {
      await prisma.eInvoiceLog
        .create({
          data: {
            eInvoiceId: invoiceId,
            action: "SEND",
            status: "FAILED",
            errorMessage: error.message,
          },
        })
        .catch(console.error);
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// Generate Electronic Tax Transaction Number (ETTN)
function generateETTN(): string {
  // ETTN is a 32-character UUID without hyphens
  return generateUUID().replace(/-/g, "").toUpperCase();
}

// Generate UUID
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Decrypt password (simple base64 decode - replace with proper decryption in production)
async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    return Buffer.from(encryptedPassword, "base64").toString("utf8");
  } catch {
    return encryptedPassword; // Return as-is if decryption fails
  }
}

// Bulk send invoices
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceIds, businessId } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Invoice IDs array is required" },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each invoice
    for (const invoiceId of invoiceIds) {
      try {
        const sendResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ invoiceId, businessId }),
          }
        );

        const result = await sendResponse.json();

        if (result.success) {
          results.push({
            invoiceId,
            success: true,
            transactionId: result.transactionId,
          });
        } else {
          errors.push({
            invoiceId,
            error: result.error,
            errorCode: result.errorCode,
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
        sent: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Bulk invoice send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}
