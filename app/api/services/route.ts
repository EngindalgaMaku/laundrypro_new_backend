import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ServiceCategory } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    // Allow optional query param to explicitly specify businessId (useful for mobile)
    const url = new URL(request.url);
    const paramBusinessId = (url.searchParams.get("businessId") ??
      undefined) as string | undefined;
    const businessIdToUse = paramBusinessId || currentUser.businessId;

    // Debug logging
    console.log(
      "[SERVICES-GET] Using businessId:",
      businessIdToUse,
      "(token businessId:",
      currentUser.businessId,
      ", param:",
      paramBusinessId,
      ")"
    );

    // Get services with pricing for the business (do NOT filter by isActive at DB level to avoid null/legacy issues)
    let services = await prisma.service.findMany({
      where: {
        businessId: businessIdToUse,
      },
      include: {
        pricings: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Auto-seed comprehensive default services if none exist (first-run UX)
    if (!services || services.length === 0) {
      console.log(
        "[SERVICES-GET] No services found for business, seeding comprehensive defaults…",
        businessIdToUse
      );

      const seedingStartTime = Date.now();
      await prisma.$transaction(
        async (tx) => {
          // Create comprehensive service catalog with multiple pricing options
          const seed = [
            // Dry Cleaning Services
            {
              name: "Kuru Temizleme - Gömlek",
              description: "Standart erkek/kadın gömlek temizleme",
              category: ServiceCategory.DRY_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 45,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Ekspres (24 saat)",
                  basePrice: 70,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Kuru Temizleme - Takım Elbise",
              description: "Erkek takım elbise (ceket + pantolon)",
              category: ServiceCategory.DRY_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 120,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Premium",
                  basePrice: 180,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Kuru Temizleme - Elbise",
              description: "Kadın elbise temizleme",
              category: ServiceCategory.DRY_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 80,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Özel Kumaş",
                  basePrice: 120,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Kuru Temizleme - Palto/Mont",
              description: "Kış paltosu ve mont temizleme",
              category: ServiceCategory.DRY_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 150,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Deri/Süet",
                  basePrice: 250,
                  pricingType: "FIXED" as const,
                },
              ],
            },

            // Laundry Services
            {
              name: "Yıkama - Çarşaf Takımı",
              description: "Çift kişilik çarşaf takımı yıkama",
              category: ServiceCategory.LAUNDRY,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 60,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Antibakteriyel",
                  basePrice: 85,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Yıkama - T-shirt/Tişört",
              description: "Pamuklu tişört yıkama",
              category: ServiceCategory.LAUNDRY,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 25,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Leke Giderme",
                  basePrice: 40,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Yıkama - Pantolon",
              description: "Kot ve kumaş pantolon yıkama",
              category: ServiceCategory.LAUNDRY,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 35,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Renk Koruma",
                  basePrice: 50,
                  pricingType: "FIXED" as const,
                },
              ],
            },

            // Ironing Services
            {
              name: "Ütü - Gömlek",
              description: "Erkek/kadın gömlek ütüleme",
              category: ServiceCategory.IRONING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 30,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Çabuk (2 saat)",
                  basePrice: 45,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Ütü - Pantolon",
              description: "Pantolon ütüleme ve kırışık giderme",
              category: ServiceCategory.IRONING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 35,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Ağır Kırışık",
                  basePrice: 50,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Ütü - Elbise",
              description: "Kadın elbise ütüleme",
              category: ServiceCategory.IRONING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 55,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Detaylı",
                  basePrice: 80,
                  pricingType: "FIXED" as const,
                },
              ],
            },

            // Carpet Cleaning Services
            {
              name: "Halı Yıkama - Küçük",
              description: "2m² altı halı yıkama",
              category: ServiceCategory.CARPET_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 80,
                  pricingType: "PER_M2" as const,
                },
                {
                  name: "Derin Temizlik",
                  basePrice: 120,
                  pricingType: "PER_M2" as const,
                },
              ],
            },
            {
              name: "Halı Yıkama - Orta",
              description: "2-6m² arası halı yıkama",
              category: ServiceCategory.CARPET_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 70,
                  pricingType: "PER_M2" as const,
                },
                {
                  name: "Leke Giderme",
                  basePrice: 95,
                  pricingType: "PER_M2" as const,
                },
              ],
            },
            {
              name: "Halı Yıkama - Büyük",
              description: "6m² üstü halı yıkama",
              category: ServiceCategory.CARPET_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 60,
                  pricingType: "PER_M2" as const,
                },
                {
                  name: "Antik/Değerli",
                  basePrice: 120,
                  pricingType: "PER_M2" as const,
                },
              ],
            },

            // Upholstery Cleaning
            {
              name: "Döşeme Temizlik - Koltuk",
              description: "3'lü koltuk takımı temizleme",
              category: ServiceCategory.UPHOLSTERY_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 200,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Deri Koltuk",
                  basePrice: 300,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Döşeme Temizlik - Tek Koltuk",
              description: "Tekli koltuk temizleme",
              category: ServiceCategory.UPHOLSTERY_CLEANING,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 80,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Leke Giderme",
                  basePrice: 120,
                  pricingType: "FIXED" as const,
                },
              ],
            },

            // Curtain Cleaning
            {
              name: "Perde Temizlik - Standart",
              description: "Normal perde yıkama ve ütüleme",
              category: ServiceCategory.CURTAIN_CLEANING,
              pricings: [
                {
                  name: "Yıkama + Ütü",
                  basePrice: 25,
                  pricingType: "PER_M2" as const,
                },
                {
                  name: "Sadece Kuru Temizlik",
                  basePrice: 35,
                  pricingType: "PER_M2" as const,
                },
              ],
            },
            {
              name: "Perde Temizlik - Özel",
              description: "İpek, kadife gibi özel kumaş perdeler",
              category: ServiceCategory.CURTAIN_CLEANING,
              pricings: [
                {
                  name: "El İşçiliği",
                  basePrice: 50,
                  pricingType: "PER_M2" as const,
                },
                {
                  name: "Profesyonel",
                  basePrice: 80,
                  pricingType: "PER_M2" as const,
                },
              ],
            },

            // Stain Removal
            {
              name: "Leke Çıkarma - Basit",
              description: "Yemek, içecek gibi basit lekeler",
              category: ServiceCategory.STAIN_REMOVAL,
              pricings: [
                {
                  name: "Standart",
                  basePrice: 40,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Eski Leke",
                  basePrice: 60,
                  pricingType: "FIXED" as const,
                },
              ],
            },
            {
              name: "Leke Çıkarma - Zor",
              description: "Kan, mürekkep, boya gibi zor lekeler",
              category: ServiceCategory.STAIN_REMOVAL,
              pricings: [
                {
                  name: "Özel İşlem",
                  basePrice: 80,
                  pricingType: "FIXED" as const,
                },
                {
                  name: "Kimyasal Müdahale",
                  basePrice: 120,
                  pricingType: "FIXED" as const,
                },
              ],
            },
          ];

          let servicesCreated = 0;
          let pricingsCreated = 0;

          for (const serviceData of seed) {
            console.log(
              `[SERVICES-SEED] Creating service: ${serviceData.name}`
            );

            const newService = await tx.service.create({
              data: {
                businessId: businessIdToUse,
                name: serviceData.name,
                description: serviceData.description,
                category: serviceData.category,
                isActive: true,
              },
            });

            servicesCreated++;

            // Create multiple pricing options for each service
            for (const pricing of serviceData.pricings) {
              await tx.servicePricing.create({
                data: {
                  serviceId: newService.id,
                  businessId: businessIdToUse,
                  name: pricing.name,
                  description: `${pricing.name} fiyatlandırma seçeneği`,
                  pricingType: pricing.pricingType,
                  basePrice: pricing.basePrice,
                  minQuantity: 1,
                  maxQuantity: 0,
                  unit: pricing.pricingType === "PER_M2" ? "m²" : "adet",
                  isActive: true,
                },
              });
              pricingsCreated++;
            }
          }

          const seedingDuration = Date.now() - seedingStartTime;
          console.log(
            `[SERVICES-SEED] ✅ Successfully seeded ${servicesCreated} services with ${pricingsCreated} pricing options in ${seedingDuration}ms for business ${businessIdToUse}`
          );
        },
        {
          timeout: 15000, // 15 seconds timeout for seeding
        }
      );

      // Re-fetch after seeding
      services = await prisma.service.findMany({
        where: { businessId: businessIdToUse },
        include: {
          pricings: {
            where: { isActive: true },
            orderBy: { basePrice: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    // Normalize response for mobile client expectations
    const normalized = services.map((s: any) => ({
      id: s.id,
      businessId: s.businessId,
      name: s.name,
      description: s.description || null,
      category: s.category,
      isActive: s.isActive !== false,
      // Provide a top-level price for convenience (use lowest active pricing if available)
      price: s.pricings?.[0]?.basePrice ?? 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      // Keep pricings for advanced UIs
      pricings: s.pricings,
    }));

    // Filter out explicitly inactive at application layer
    const visible = normalized.filter((s) => s.isActive !== false);
    console.log(
      "[SERVICES-GET] Found services:",
      services.length,
      "Visible after filter:",
      visible.length
    );
    return NextResponse.json(visible);
  } catch (error) {
    console.error("Get services error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, category, pricings } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // Create service with pricings in a transaction
    const service = await prisma.$transaction(async (tx) => {
      // Create the service
      const newService = await tx.service.create({
        data: {
          businessId: currentUser.businessId!,
          name,
          description,
          category,
        },
      });

      // Create pricings if provided
      if (pricings && pricings.length > 0) {
        await tx.servicePricing.createMany({
          data: pricings.map((pricing: any) => ({
            serviceId: newService.id,
            businessId: currentUser.businessId!,
            name: pricing.name,
            description: pricing.description,
            pricingType: pricing.pricingType,
            basePrice: pricing.basePrice,
            minQuantity: pricing.minQuantity,
            maxQuantity: pricing.maxQuantity,
            unit: pricing.unit,
          })),
        });
      }

      // Return service with pricings
      return await tx.service.findUnique({
        where: { id: newService.id },
        include: {
          pricings: {
            where: { isActive: true },
            orderBy: { basePrice: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
