import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuthRequest } from "@/lib/auth-utils";

// GET - İşletmenin hizmet ayarlarını getir
export async function GET(request: NextRequest) {
  try {
    const validation = await validateAuthRequest(request);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 401 }
      );
    }

    const businessId = validation.user.businessId || validation.business?.id;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Şimdilik basit bir response döndürelim - schema güncellenmesi gerekli
    const defaultSettings = {
      id: "temp_id",
      businessId,
      urgentServiceEnabled: true,
      urgentMultiplier: 1.25,
      bulkDiscountEnabled: true,
      bulkDiscountThreshold: 10,
      bulkDiscountPercent: 0.1,
      minOrderAmount: null,
      defaultVatRate: 20,
      vatIncluded: true,
      priceRounding: true,
      roundingUnit: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error("Error fetching service settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - İşletmenin hizmet ayarlarını güncelle
export async function PUT(request: NextRequest) {
  try {
    const validation = await validateAuthRequest(request);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 401 }
      );
    }

    const businessId = validation.user.businessId || validation.business?.id;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const data = await request.json();

    // Validation
    const validatedData = {
      urgentServiceEnabled: data.urgentServiceEnabled ?? true,
      urgentMultiplier: Math.max(1.0, Number(data.urgentMultiplier) || 1.25),
      bulkDiscountEnabled: data.bulkDiscountEnabled ?? true,
      bulkDiscountThreshold: Math.max(
        1,
        Number(data.bulkDiscountThreshold) || 10
      ),
      bulkDiscountPercent: Math.max(
        0,
        Math.min(1, Number(data.bulkDiscountPercent) || 0.1)
      ),
      minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : null,
      defaultVatRate: Math.max(
        0,
        Math.min(100, Number(data.defaultVatRate) || 20)
      ),
      vatIncluded: data.vatIncluded ?? true,
      priceRounding: data.priceRounding ?? true,
      roundingUnit: Number(data.roundingUnit) || 0.5,
    };

    // Şimdilik validatedData'yı döndürelim - database operasyonları schema güncellemesinden sonra
    const settings = {
      id: "temp_id",
      businessId,
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating service settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
