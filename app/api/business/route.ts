import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createBusiness } from "@/lib/database/business";
import { UserDatabaseService } from "@/lib/database/users";
import { BusinessType } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessName,
      phone,
      email,
      address,
      city,
      district,
      description,
      businessTypes,
      userId,
    } = body;

    // Create new business
    const newBusiness = await createBusiness({
      name: businessName,
      businessType:
        businessTypes && businessTypes[0]
          ? (businessTypes[0] as BusinessType)
          : BusinessType.LAUNDRY,
      email: email,
      phone: phone,
      address: address,
      city: city,
      district: district,
      description: description,
    });

    // Auto-create default integration settings (best-effort)
    try {
      await Promise.all([
        prisma.whatsAppSettings.upsert({
          where: { businessId: newBusiness.id },
          update: {},
          create: {
            businessId: newBusiness.id,
            isEnabled: false,
            accessToken: "",
            phoneNumberId: "",
            businessAccountId: "",
            webhookToken: "",
            displayPhoneNumber: "",
            qualityRating: "UNKNOWN",
          },
        }),
        prisma.eInvoiceSettings.upsert({
          where: { businessId: newBusiness.id },
          update: {},
          create: {
            businessId: newBusiness.id,
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
        }),
      ]);
    } catch (seedErr) {
      console.warn("[Business][POST] Default settings creation warning:", seedErr);
      // Non-fatal – proceed
    }

    // Update user to associate with this business
    if (userId) {
      await UserDatabaseService.updateUser(userId, {
        businessId: newBusiness.id,
      });
    }

    return NextResponse.json({
      message: "Business created successfully",
      business: newBusiness,
    });
  } catch (error) {
    console.error("Create business error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
