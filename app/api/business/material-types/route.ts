import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuthRequest } from "@/lib/auth-utils";

// GET - İşletmenin malzeme türlerini getir
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

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Şimdilik default material types döndürelim
    const defaultMaterialTypes = [
      // Kuru Temizleme
      ...(category === "DRY_CLEANING" || !category
        ? [
            {
              id: "cotton",
              businessId,
              name: "Pamuk",
              code: "COTTON",
              description: "Standart pamuk kumaş",
              category: "DRY_CLEANING",
              multiplier: 1.0,
              requiresSpecialHandling: false,
              extraServiceTime: null,
              isActive: true,
              sortOrder: 1,
            },
            {
              id: "wool",
              businessId,
              name: "Yün",
              code: "WOOL",
              description: "Özel dikkat gerektiren yün kumaş",
              category: "DRY_CLEANING",
              multiplier: 1.3,
              requiresSpecialHandling: true,
              extraServiceTime: 30,
              isActive: true,
              sortOrder: 2,
            },
            {
              id: "silk",
              businessId,
              name: "İpek",
              code: "SILK",
              description: "Hassas ipek kumaş",
              category: "DRY_CLEANING",
              multiplier: 1.5,
              requiresSpecialHandling: true,
              extraServiceTime: 45,
              isActive: true,
              sortOrder: 3,
            },
            {
              id: "leather",
              businessId,
              name: "Deri",
              code: "LEATHER",
              description: "Deri ve süet malzemeler",
              category: "DRY_CLEANING",
              multiplier: 2.5,
              requiresSpecialHandling: true,
              extraServiceTime: 60,
              isActive: true,
              sortOrder: 4,
            },
          ]
        : []),

      // Halı Temizleme
      ...(category === "CARPET_CLEANING" || !category
        ? [
            {
              id: "synthetic_carpet",
              businessId,
              name: "Sentetik Halı",
              code: "SYNTHETIC_CARPET",
              description: "Sentetik malzemeli halılar",
              category: "CARPET_CLEANING",
              multiplier: 1.0,
              requiresSpecialHandling: false,
              extraServiceTime: null,
              isActive: true,
              sortOrder: 1,
            },
            {
              id: "wool_carpet",
              businessId,
              name: "Yün Halı",
              code: "WOOL_CARPET",
              description: "Doğal yün halılar",
              category: "CARPET_CLEANING",
              multiplier: 1.4,
              requiresSpecialHandling: true,
              extraServiceTime: 30,
              isActive: true,
              sortOrder: 2,
            },
            {
              id: "persian_carpet",
              businessId,
              name: "Fars Halısı",
              code: "PERSIAN_CARPET",
              description: "Değerli el dokuması halılar",
              category: "CARPET_CLEANING",
              multiplier: 2.0,
              requiresSpecialHandling: true,
              extraServiceTime: 90,
              isActive: true,
              sortOrder: 3,
            },
          ]
        : []),
    ];

    return NextResponse.json({
      materialTypes: defaultMaterialTypes,
      total: defaultMaterialTypes.length,
    });
  } catch (error) {
    console.error("Error fetching material types:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Yeni malzeme türü oluştur
export async function POST(request: NextRequest) {
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
    if (!data.name || !data.code || !data.category) {
      return NextResponse.json(
        { error: "Name, code and category are required" },
        { status: 400 }
      );
    }

    const materialType = {
      id: `custom_${Date.now()}`,
      businessId,
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || null,
      category: data.category,
      multiplier: Math.max(0.1, Number(data.multiplier) || 1.0),
      requiresSpecialHandling: Boolean(data.requiresSpecialHandling),
      extraServiceTime: data.extraServiceTime
        ? Number(data.extraServiceTime)
        : null,
      isActive: true,
      sortOrder: Number(data.sortOrder) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json(materialType, { status: 201 });
  } catch (error) {
    console.error("Error creating material type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
