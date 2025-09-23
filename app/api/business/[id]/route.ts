import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
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
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
        taxRate: 18,
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
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    } = body;
    const { id } = await params;

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
      city: city,
      district: district,
      description: description,
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
