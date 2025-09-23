import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// Helper: convert non-serializable fields (BigInt) to JSON-safe values
function serializeEInvoiceConfig(config: any) {
  if (!config) return config;
  return {
    ...config,
    // Prisma returns BigInt for this column
    currentInvoiceNumber:
      config.currentInvoiceNumber !== undefined && config.currentInvoiceNumber !== null
        ? Number(config.currentInvoiceNumber)
        : config.currentInvoiceNumber,
  };
}

// GET /api/e-invoice/config/[businessId]
// Returns E-Invoice settings for the business, creating a default record if missing
async function handler(
  request: NextRequest,
  auth: { user: any; business?: any }
) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const businessId = segments[segments.length - 1];

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  if (auth.user?.businessId && auth.user.businessId !== businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let config = await prisma.eInvoiceSettings.findUnique({
      where: { businessId },
      select: {
        id: true,
        businessId: true,
        isEnabled: true,
        gibUsername: true,
        gibTestMode: true,
        gibPortalUrl: true,
        certificatePath: true,
        invoiceSeriesPrefix: true,
        currentInvoiceNumber: true,
        invoiceNumberLength: true,
        companyVkn: true,
        companyTitle: true,
        companyAddress: true,
        companyDistrict: true,
        companyCity: true,
        companyPostalCode: true,
        companyCountry: true,
        companyEmail: true,
        companyPhone: true,
        companyWebsite: true,
        autoCreateInvoice: true,
        autoSendInvoice: true,
        invoiceOnPayment: true,
        invoiceOnOrderComplete: true,
        archiveRetentionYears: true,
        lastArchiveDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!config) {
      const created = await prisma.eInvoiceSettings.create({
        data: {
          businessId,
          isEnabled: false,
          gibTestMode: true,
          gibPortalUrl: "https://earsivportal.efatura.gov.tr",
          invoiceSeriesPrefix: "EMU",
          currentInvoiceNumber: BigInt(1),
          invoiceNumberLength: 8,
          companyCountry: "Türkiye",
          autoCreateInvoice: false,
          autoSendInvoice: false,
          invoiceOnPayment: true,
          invoiceOnOrderComplete: false,
          archiveRetentionYears: 5,
        },
        select: {
          id: true,
          businessId: true,
          isEnabled: true,
          gibUsername: true,
          gibTestMode: true,
          gibPortalUrl: true,
          certificatePath: true,
          invoiceSeriesPrefix: true,
          currentInvoiceNumber: true,
          invoiceNumberLength: true,
          companyVkn: true,
          companyTitle: true,
          companyAddress: true,
          companyDistrict: true,
          companyCity: true,
          companyPostalCode: true,
          companyCountry: true,
          companyEmail: true,
          companyPhone: true,
          companyWebsite: true,
          autoCreateInvoice: true,
          autoSendInvoice: true,
          invoiceOnPayment: true,
          invoiceOnOrderComplete: true,
          archiveRetentionYears: true,
          lastArchiveDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      config = created;
    }

    return NextResponse.json({ success: true, config: serializeEInvoiceConfig(config) });
  } catch (error) {
    console.error("[E-Invoice Settings][GET] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth((req: NextRequest, authData: { user: any; business?: any }) =>
  handler(req, authData)
);

// PATCH /api/e-invoice/config/[businessId]
// Update E-Invoice settings (OWNER and MANAGER only). Upserts if missing.
async function patchHandler(
  request: NextRequest,
  auth: { user: any; business?: any }
) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const businessId = segments[segments.length - 1];

  if (!businessId) {
    return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
  }

  // Role-based authorization
  const role = auth.user?.role as string | undefined;
  if (!role || (role !== "OWNER" && role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (auth.user?.businessId && auth.user.businessId !== businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const updated = await prisma.eInvoiceSettings.upsert({
      where: { businessId },
      update: {
        ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
        ...(body.gibUsername !== undefined ? { gibUsername: body.gibUsername } : {}),
        ...(body.gibPassword !== undefined ? { gibPassword: body.gibPassword } : {}),
        ...(body.gibTestMode !== undefined ? { gibTestMode: body.gibTestMode } : {}),
        ...(body.gibPortalUrl !== undefined ? { gibPortalUrl: body.gibPortalUrl } : {}),
        ...(body.certificatePath !== undefined ? { certificatePath: body.certificatePath } : {}),
        ...(body.certificatePassword !== undefined ? { certificatePassword: body.certificatePassword } : {}),
        ...(body.invoiceSeriesPrefix !== undefined ? { invoiceSeriesPrefix: body.invoiceSeriesPrefix } : {}),
        ...(body.currentInvoiceNumber !== undefined ? { currentInvoiceNumber: BigInt(body.currentInvoiceNumber) } : {}),
        ...(body.invoiceNumberLength !== undefined ? { invoiceNumberLength: body.invoiceNumberLength } : {}),
        ...(body.companyVkn !== undefined ? { companyVkn: body.companyVkn } : {}),
        ...(body.companyTitle !== undefined ? { companyTitle: body.companyTitle } : {}),
        ...(body.companyAddress !== undefined ? { companyAddress: body.companyAddress } : {}),
        ...(body.companyDistrict !== undefined ? { companyDistrict: body.companyDistrict } : {}),
        ...(body.companyCity !== undefined ? { companyCity: body.companyCity } : {}),
        ...(body.companyPostalCode !== undefined ? { companyPostalCode: body.companyPostalCode } : {}),
        ...(body.companyCountry !== undefined ? { companyCountry: body.companyCountry } : {}),
        ...(body.companyEmail !== undefined ? { companyEmail: body.companyEmail } : {}),
        ...(body.companyPhone !== undefined ? { companyPhone: body.companyPhone } : {}),
        ...(body.companyWebsite !== undefined ? { companyWebsite: body.companyWebsite } : {}),
        ...(body.autoCreateInvoice !== undefined ? { autoCreateInvoice: body.autoCreateInvoice } : {}),
        ...(body.autoSendInvoice !== undefined ? { autoSendInvoice: body.autoSendInvoice } : {}),
        ...(body.invoiceOnPayment !== undefined ? { invoiceOnPayment: body.invoiceOnPayment } : {}),
        ...(body.invoiceOnOrderComplete !== undefined ? { invoiceOnOrderComplete: body.invoiceOnOrderComplete } : {}),
        ...(body.archiveRetentionYears !== undefined ? { archiveRetentionYears: body.archiveRetentionYears } : {}),
        ...(body.lastArchiveDate !== undefined ? { lastArchiveDate: new Date(body.lastArchiveDate) } : {}),
      },
      create: {
        businessId,
        isEnabled: !!body.isEnabled,
        gibUsername: body.gibUsername ?? null,
        gibPassword: body.gibPassword ?? null,
        gibTestMode: body.gibTestMode ?? true,
        gibPortalUrl: body.gibPortalUrl ?? "https://earsivportal.efatura.gov.tr",
        certificatePath: body.certificatePath ?? null,
        certificatePassword: body.certificatePassword ?? null,
        invoiceSeriesPrefix: body.invoiceSeriesPrefix ?? "EMU",
        currentInvoiceNumber: BigInt(body.currentInvoiceNumber ?? 1),
        invoiceNumberLength: body.invoiceNumberLength ?? 8,
        companyVkn: body.companyVkn ?? null,
        companyTitle: body.companyTitle ?? null,
        companyAddress: body.companyAddress ?? null,
        companyDistrict: body.companyDistrict ?? null,
        companyCity: body.companyCity ?? null,
        companyPostalCode: body.companyPostalCode ?? null,
        companyCountry: body.companyCountry ?? "Türkiye",
        companyEmail: body.companyEmail ?? null,
        companyPhone: body.companyPhone ?? null,
        companyWebsite: body.companyWebsite ?? null,
        autoCreateInvoice: body.autoCreateInvoice ?? false,
        autoSendInvoice: body.autoSendInvoice ?? false,
        invoiceOnPayment: body.invoiceOnPayment ?? true,
        invoiceOnOrderComplete: body.invoiceOnOrderComplete ?? false,
        archiveRetentionYears: body.archiveRetentionYears ?? 5,
        lastArchiveDate: body.lastArchiveDate ? new Date(body.lastArchiveDate) : null,
      },
      select: {
        id: true,
        businessId: true,
        isEnabled: true,
        gibUsername: true,
        gibTestMode: true,
        gibPortalUrl: true,
        certificatePath: true,
        invoiceSeriesPrefix: true,
        currentInvoiceNumber: true,
        invoiceNumberLength: true,
        companyVkn: true,
        companyTitle: true,
        companyAddress: true,
        companyDistrict: true,
        companyCity: true,
        companyPostalCode: true,
        companyCountry: true,
        companyEmail: true,
        companyPhone: true,
        companyWebsite: true,
        autoCreateInvoice: true,
        autoSendInvoice: true,
        invoiceOnPayment: true,
        invoiceOnOrderComplete: true,
        archiveRetentionYears: true,
        lastArchiveDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, config: serializeEInvoiceConfig(updated) });
  } catch (error) {
    console.error("[E-Invoice Settings][PATCH] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const PATCH = withAuth((req: NextRequest, authData: { user: any; business?: any }) =>
  patchHandler(req, authData)
);
