import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get E-Fatura settings for a business
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    const settings = await prisma.eInvoiceSettings.findUnique({
      where: { businessId },
      select: {
        id: true,
        businessId: true,
        isEnabled: true,
        gibTestMode: true,
        gibPortalUrl: true,
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
        certificateValidUntil: true,
        createdAt: true,
        updatedAt: true,
        // Don't return sensitive data
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("E-Fatura settings GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Create or update E-Fatura settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      isEnabled,
      gibUsername,
      gibPassword,
      gibTestMode,
      gibPortalUrl,
      certificatePath,
      certificatePassword,
      certificateValidUntil,
      invoiceSeriesPrefix,
      invoiceNumberLength,
      companyVkn,
      companyTitle,
      companyAddress,
      companyDistrict,
      companyCity,
      companyPostalCode,
      companyCountry,
      companyEmail,
      companyPhone,
      companyWebsite,
      autoCreateInvoice,
      autoSendInvoice,
      invoiceOnPayment,
      invoiceOnOrderComplete,
      archiveRetentionYears,
    } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Validate required fields if enabling E-Fatura
    if (isEnabled) {
      if (!companyVkn || !companyTitle) {
        return NextResponse.json(
          {
            error: "Company VKN and title are required when enabling E-Fatura",
          },
          { status: 400 }
        );
      }

      // Validate VKN format (10 digits)
      if (!/^\d{10}$/.test(companyVkn)) {
        return NextResponse.json(
          { error: "VKN must be 10 digits" },
          { status: 400 }
        );
      }
    }

    // Test GIB connection if credentials provided
    let testResult = null;
    if (isEnabled && gibUsername && gibPassword) {
      testResult = await testGibConnection({
        username: gibUsername,
        password: gibPassword,
        testMode: gibTestMode ?? true,
        portalUrl: gibPortalUrl,
      });

      if (!testResult.success) {
        return NextResponse.json(
          {
            error: "GIB connection test failed",
            details: testResult.error,
          },
          { status: 400 }
        );
      }
    }

    const settings = await prisma.eInvoiceSettings.upsert({
      where: { businessId },
      update: {
        isEnabled: isEnabled ?? false,
        ...(gibUsername && { gibUsername }),
        ...(gibPassword && { gibPassword: await encryptPassword(gibPassword) }),
        gibTestMode: gibTestMode ?? true,
        gibPortalUrl: gibPortalUrl ?? "https://earsivportal.efatura.gov.tr",
        ...(certificatePath && { certificatePath }),
        ...(certificatePassword && {
          certificatePassword: await encryptPassword(certificatePassword),
        }),
        ...(certificateValidUntil && {
          certificateValidUntil: new Date(certificateValidUntil),
        }),
        invoiceSeriesPrefix: invoiceSeriesPrefix ?? "EMU",
        invoiceNumberLength: invoiceNumberLength ?? 8,
        companyVkn: companyVkn ?? "",
        companyTitle: companyTitle ?? "",
        companyAddress: companyAddress ?? "",
        companyDistrict: companyDistrict ?? "",
        companyCity: companyCity ?? "",
        companyPostalCode: companyPostalCode ?? "",
        companyCountry: companyCountry ?? "Türkiye",
        companyEmail: companyEmail ?? "",
        companyPhone: companyPhone ?? "",
        companyWebsite: companyWebsite ?? "",
        autoCreateInvoice: autoCreateInvoice ?? false,
        autoSendInvoice: autoSendInvoice ?? false,
        invoiceOnPayment: invoiceOnPayment ?? true,
        invoiceOnOrderComplete: invoiceOnOrderComplete ?? false,
        archiveRetentionYears: archiveRetentionYears ?? 5,
        updatedAt: new Date(),
      },
      create: {
        businessId,
        isEnabled: isEnabled ?? false,
        gibUsername: gibUsername ?? "",
        gibPassword: gibPassword ? await encryptPassword(gibPassword) : "",
        gibTestMode: gibTestMode ?? true,
        gibPortalUrl: gibPortalUrl ?? "https://earsivportal.efatura.gov.tr",
        certificatePath: certificatePath ?? "",
        certificatePassword: certificatePassword
          ? await encryptPassword(certificatePassword)
          : "",
        certificateValidUntil: certificateValidUntil
          ? new Date(certificateValidUntil)
          : null,
        invoiceSeriesPrefix: invoiceSeriesPrefix ?? "EMU",
        invoiceNumberLength: invoiceNumberLength ?? 8,
        companyVkn: companyVkn ?? "",
        companyTitle: companyTitle ?? "",
        companyAddress: companyAddress ?? "",
        companyDistrict: companyDistrict ?? "",
        companyCity: companyCity ?? "",
        companyPostalCode: companyPostalCode ?? "",
        companyCountry: companyCountry ?? "Türkiye",
        companyEmail: companyEmail ?? "",
        companyPhone: companyPhone ?? "",
        companyWebsite: companyWebsite ?? "",
        autoCreateInvoice: autoCreateInvoice ?? false,
        autoSendInvoice: autoSendInvoice ?? false,
        invoiceOnPayment: invoiceOnPayment ?? true,
        invoiceOnOrderComplete: invoiceOnOrderComplete ?? false,
        archiveRetentionYears: archiveRetentionYears ?? 5,
      },
      select: {
        id: true,
        businessId: true,
        isEnabled: true,
        gibTestMode: true,
        gibPortalUrl: true,
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
        certificateValidUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
      message: "E-Fatura settings saved successfully",
      ...(testResult && { testResult }),
    });
  } catch (error: any) {
    console.error("E-Fatura settings POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Test GIB connection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, gibUsername, gibPassword, gibTestMode, gibPortalUrl } =
      body;

    if (!businessId || !gibUsername || !gibPassword) {
      return NextResponse.json(
        {
          error: "Business ID, GIB username, and password are required",
        },
        { status: 400 }
      );
    }

    const testResult = await testGibConnection({
      username: gibUsername,
      password: gibPassword,
      testMode: gibTestMode ?? true,
      portalUrl: gibPortalUrl,
    });

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success
        ? "GIB connection test successful"
        : "GIB connection test failed",
      details: testResult,
    });
  } catch (error: any) {
    console.error("GIB connection test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Delete E-Fatura settings (disable integration)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    // Instead of deleting, disable the integration
    await prisma.eInvoiceSettings.update({
      where: { businessId },
      data: {
        isEnabled: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "E-Fatura integration disabled successfully",
    });
  } catch (error: any) {
    console.error("E-Fatura settings DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Test GIB portal connection
async function testGibConnection(config: {
  username: string;
  password: string;
  testMode: boolean;
  portalUrl?: string;
}) {
  try {
    // Import GIB portal service
    const { GIBPortalService } = await import(
      "@/lib/e-fatura/gib-portal-service"
    );

    const gibService = new GIBPortalService({
      username: config.username,
      password: config.password,
      testMode: config.testMode,
      portalUrl: config.portalUrl || "https://earsivportal.efatura.gov.tr",
    });

    // Test connection
    const result = await gibService.testConnection();

    return {
      success: result,
      connectionStatus: result ? "Connected" : "Failed",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "GIB connection test failed",
    };
  }
}

// Simple encryption for passwords (in production, use proper encryption)
async function encryptPassword(password: string): Promise<string> {
  // For now, just base64 encode (NOT secure for production)
  // In production, use proper encryption like crypto.encrypt
  return Buffer.from(password).toString("base64");
}
