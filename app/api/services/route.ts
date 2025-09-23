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

    // Auto-seed minimal default services if none exist (first-run UX)
    if (!services || services.length === 0) {
      console.log(
        "[SERVICES-GET] No services found for business, seeding defaults…",
        businessIdToUse
      );
      await prisma.$transaction(async (tx) => {
        // Create 2-3 basic services with a single active pricing each
        const seed = [
          {
            name: "Kuru Temizleme - Gömlek",
            description: "Standart gömlek temizleme",
            category: ServiceCategory.DRY_CLEANING,
            basePrice: 50,
          },
          {
            name: "Ütü - Pantolon",
            description: "Pantolon ütüleme",
            category: ServiceCategory.IRONING,
            basePrice: 40,
          },
          {
            name: "Yıkama - Çarşaf",
            description: "Çarşaf yıkama",
            category: ServiceCategory.LAUNDRY,
            basePrice: 60,
          },
        ];

        for (const s of seed) {
          const newService = await tx.service.create({
            data: {
              businessId: businessIdToUse,
              name: s.name,
              description: s.description,
              category: s.category,
              isActive: true,
            },
          });
          await tx.servicePricing.create({
            data: {
              serviceId: newService.id,
              businessId: businessIdToUse,
              name: "Standart",
              description: "",
              pricingType: "FIXED",
              basePrice: s.basePrice,
              minQuantity: 1,
              maxQuantity: 0,
              unit: "adet",
              isActive: true,
            },
          });
        }
      });

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
