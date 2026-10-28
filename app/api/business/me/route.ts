import { NextRequest, NextResponse } from "next/server";
import { validateAuthRequest } from "@/lib/auth-utils";
import { getBusinessById } from "@/lib/database/business";
import { vatSettingsOf } from "@/lib/vat";

export async function GET(request: NextRequest) {
  try {
    const validation = await validateAuthRequest(request);
    
    if (!validation.success) {
      // For mobile apps, always return 401 for auth failures to trigger re-login
      return NextResponse.json(
        { 
          error: "Authentication required",
          requiresLogin: true,
          message: "Oturum süresi doldu. Lütfen tekrar giriş yapın."
        },
        { status: 401 }
      );
    }

    if (!validation.business) {
      return NextResponse.json(
        { 
          error: "Authentication required",
          requiresLogin: true,
          message: "İşletme bilgisi bulunamadı. Lütfen tekrar giriş yapın."
        },
        { status: 401 }
      );
    }

    const business = validation.business;

    console.log("🔍 [BusinessMe] Raw business data:", {
      id: business.id,
      name: business.name,
      businessType: business.businessType,
      hasServices: !!(business as any).services,
      servicesCount: (business as any).services?.length || 0
    });

    // Get business with service types from database
    const businessWithTypes = await getBusinessById(business.id);
    console.log("🔍 [BusinessMe] Business with types:", {
      id: businessWithTypes?.id,
      businessTypes: businessWithTypes?.businessTypes
    });

    // Ensure business has all required settings structure
    const businessWithSettings = {
      ...business,
      // Include business type information from database
      type: business.businessType,
      businessTypes: businessWithTypes?.businessTypes || [business.businessType].filter(Boolean),
      settings: {
        businessHours: (business as any).businessHours || {
          monday: {
            isOpen: true,
            openTime: "09:00",
            closeTime: "18:00",
            breaks: [],
          },
          tuesday: {
            isOpen: true,
            openTime: "09:00",
            closeTime: "18:00",
            breaks: [],
          },
          wednesday: {
            isOpen: true,
            openTime: "09:00",
            closeTime: "18:00",
            breaks: [],
          },
          thursday: {
            isOpen: true,
            openTime: "09:00",
            closeTime: "18:00",
            breaks: [],
          },
          friday: {
            isOpen: true,
            openTime: "09:00",
            closeTime: "18:00",
            breaks: [],
          },
          saturday: {
            isOpen: true,
            openTime: "09:00",
            closeTime: "18:00",
            breaks: [],
          },
          sunday: { isOpen: false, breaks: [] },
        },
        defaultCurrency: "TRY",
        taxRate: vatSettingsOf(business).vatRate,
        pricesIncludeVat: vatSettingsOf(business).pricesIncludeVat,
        eInvoiceEnabled: false,
        whatsappEnabled: false,
        timezone: "Europe/Istanbul",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "HH:mm",
      },
    };

    return NextResponse.json({ business: businessWithSettings });
  } catch (error) {
    console.error("Get business error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
