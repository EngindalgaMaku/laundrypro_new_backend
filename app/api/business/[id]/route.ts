import { NextRequest, NextResponse } from "next/server";
import { normalizeCity, normalizeDistrict } from "@/lib/turkish-locations";
import { requireBusinessAuth } from "@/lib/auth-utils";
import { isValidVatRate, vatSettingsOf } from "@/lib/vat";
import {
  getBusinessById,
  updateBusiness,
  updateBusinessServiceTypes,
} from "@/lib/database/business";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBusinessAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (id !== auth.businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const businessData = await getBusinessById(id);

    if (!businessData) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Ensure consistent format with /business/me endpoint
    // Add missing settings structure that mobile expects
    const businessWithSettings = {
      ...businessData,
      settings: {
        businessHours: (businessData as any).businessHours || {
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
        taxRate: vatSettingsOf(businessData).vatRate,
        pricesIncludeVat: vatSettingsOf(businessData).pricesIncludeVat,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBusinessAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const {
      businessName,
      businessTypes,
      type,
      phone,
      email,
      address,
      city,
      district,
      description,
      vatRate,
      pricesIncludeVat,
    } = body;
    const { id } = await params;

    if (id !== auth.businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (vatRate !== undefined && !isValidVatRate(vatRate)) {
      return NextResponse.json(
        { error: "Geçersiz KDV oranı: 0 ile 100 arasında, en fazla iki ondalıklı bir sayı girin." },
        { status: 400 }
      );
    }
    if (pricesIncludeVat !== undefined && typeof pricesIncludeVat !== "boolean") {
      return NextResponse.json({ error: "pricesIncludeVat true/false olmalıdır." }, { status: 400 });
    }

    console.log("🔍 [BusinessUpdate] Update request:", {
      businessId: id,
      businessName,
      businessTypes,
      type,
      isBusinessTypesArray: Array.isArray(businessTypes),
      businessTypesLength: Array.isArray(businessTypes)
        ? businessTypes.length
        : "not array",
    });

    // Handle business type - prefer businessTypes array, fallback to type
    const finalBusinessTypes = businessTypes || type;
    const businessType = Array.isArray(finalBusinessTypes)
      ? finalBusinessTypes[0]
      : finalBusinessTypes;

    const updatedBusiness = await updateBusiness(id, {
      name: businessName,
      businessType: businessType,
      phone: phone,
      email: email,
      address: address,
      city: city !== undefined ? normalizeCity(city) : city,
      district: district !== undefined ? normalizeDistrict(city ?? "", district) : district,
      description: description,
      ...(vatRate !== undefined && { vatRate }),
      ...(pricesIncludeVat !== undefined && { pricesIncludeVat }),
    });

    // Update business service types if provided
    if (finalBusinessTypes && Array.isArray(finalBusinessTypes)) {
      console.log(
        "🔄 [BusinessUpdate] Updating service types:",
        finalBusinessTypes
      );
      await updateBusinessServiceTypes(id, finalBusinessTypes);
    }

    // Get updated business with service types
    const businessWithTypes = await getBusinessById(id);

    return NextResponse.json({
      message: "Business updated successfully",
      business: businessWithTypes,
    });
  } catch (error) {
    console.error("Update business error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
