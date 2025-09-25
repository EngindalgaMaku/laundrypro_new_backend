import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, ServiceCategory } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Business type to service category mapping
const BUSINESS_TYPE_TO_SERVICE_CATEGORY: Record<string, ServiceCategory> = {
  LAUNDRY: ServiceCategory.LAUNDRY,
  DRY_CLEANING: ServiceCategory.DRY_CLEANING,
  CARPET_CLEANING: ServiceCategory.CARPET_CLEANING,
  UPHOLSTERY_CLEANING: ServiceCategory.UPHOLSTERY_CLEANING,
  CURTAIN_CLEANING: ServiceCategory.CURTAIN_CLEANING,
  OTHER: ServiceCategory.OTHER,
};

// Service category to business type mapping (with some categories mapping to multiple types)
const SERVICE_CATEGORY_TO_BUSINESS_TYPE: Record<ServiceCategory, string> = {
  [ServiceCategory.LAUNDRY]: "LAUNDRY",
  [ServiceCategory.DRY_CLEANING]: "DRY_CLEANING",
  [ServiceCategory.IRONING]: "LAUNDRY", // Ironing is part of laundry services
  [ServiceCategory.CARPET_CLEANING]: "CARPET_CLEANING",
  [ServiceCategory.UPHOLSTERY_CLEANING]: "UPHOLSTERY_CLEANING",
  [ServiceCategory.CURTAIN_CLEANING]: "CURTAIN_CLEANING",
  [ServiceCategory.STAIN_REMOVAL]: "OTHER", // Stain removal can be categorized as other
  [ServiceCategory.OTHER]: "OTHER",
};

const requestSchema = z.object({
  currentTypes: z.array(z.string()),
  newTypes: z.array(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { currentTypes, newTypes } = requestSchema.parse(body);

    console.log(
      "🔍 [Service Impact] Analyzing impact for business:",
      businessId
    );
    console.log("   Current types:", currentTypes);
    console.log("   New types:", newTypes);

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Calculate added and removed types
    const removedTypes = currentTypes.filter(
      (type) => !newTypes.includes(type)
    );
    const addedTypes = newTypes.filter((type) => !currentTypes.includes(type));

    console.log("   Removed types:", removedTypes);
    console.log("   Added types:", addedTypes);

    // If no types are being removed, there's no negative impact
    if (removedTypes.length === 0) {
      return NextResponse.json({
        affectedServices: [],
        removedTypes: [],
        addedTypes,
        totalAffected: 0,
      });
    }

    // Find services that will be affected by the removal of business types
    const affectedServices: Array<{
      category: string;
      count: number;
      serviceNames: string[];
    }> = [];

    let totalAffected = 0;

    // For each removed business type, find corresponding service categories
    for (const removedType of removedTypes) {
      const correspondingCategory =
        BUSINESS_TYPE_TO_SERVICE_CATEGORY[removedType];

      if (correspondingCategory) {
        // Find services in this category for the business
        const servicesInCategory = await prisma.service.findMany({
          where: {
            businessId: businessId,
            category: correspondingCategory,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            category: true,
          },
        });

        if (servicesInCategory.length > 0) {
          // Check if any of the new types would still cover this category
          const stillCovered = newTypes.some((newType) => {
            const newTypeCategory = BUSINESS_TYPE_TO_SERVICE_CATEGORY[newType];
            return newTypeCategory === correspondingCategory;
          });

          // Only consider it affected if it won't be covered by remaining types
          if (!stillCovered) {
            affectedServices.push({
              category: correspondingCategory,
              count: servicesInCategory.length,
              serviceNames: servicesInCategory.map((s) => s.name),
            });
            totalAffected += servicesInCategory.length;
          }
        }
      }
    }

    // Also check for service categories that might be affected by complex mappings
    // For example, IRONING services are affected if LAUNDRY business type is removed
    const complexMappings = [
      { serviceCategory: ServiceCategory.IRONING, businessType: "LAUNDRY" },
      { serviceCategory: ServiceCategory.STAIN_REMOVAL, businessType: "OTHER" },
    ];

    for (const mapping of complexMappings) {
      if (removedTypes.includes(mapping.businessType)) {
        // Check if this service category will still be covered by remaining types
        const stillCovered =
          newTypes.includes(mapping.businessType) ||
          newTypes.some((newType) => {
            const newTypeCategory = BUSINESS_TYPE_TO_SERVICE_CATEGORY[newType];
            return newTypeCategory === mapping.serviceCategory;
          });

        if (!stillCovered) {
          const servicesInCategory = await prisma.service.findMany({
            where: {
              businessId: businessId,
              category: mapping.serviceCategory,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              category: true,
            },
          });

          if (servicesInCategory.length > 0) {
            // Check if we already added this category
            const existingCategory = affectedServices.find(
              (a) => a.category === mapping.serviceCategory
            );
            if (!existingCategory) {
              affectedServices.push({
                category: mapping.serviceCategory,
                count: servicesInCategory.length,
                serviceNames: servicesInCategory.map((s) => s.name),
              });
              totalAffected += servicesInCategory.length;
            }
          }
        }
      }
    }

    console.log(`   Total affected services: ${totalAffected}`);
    console.log(
      "   Affected categories:",
      affectedServices.map((a) => `${a.category} (${a.count})`)
    );

    const response = {
      affectedServices,
      removedTypes,
      addedTypes,
      totalAffected,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Service Impact] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Also support GET for debugging/inspection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Get current business service types and services for inspection
    const [business, businessServiceTypes, services] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
      }),
      prisma.businessServiceType.findMany({
        where: { businessId: businessId },
      }),
      prisma.service.findMany({
        where: {
          businessId: businessId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          category: true,
        },
      }),
    ]);

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const currentServiceTypes = businessServiceTypes.map(
      (bst) => bst.serviceType
    );
    const serviceCategories = [...new Set(services.map((s) => s.category))];

    // Group services by category
    const servicesByCategory = services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {} as Record<string, typeof services>);

    return NextResponse.json({
      businessId,
      businessName: business.name,
      currentServiceTypes,
      serviceCategories,
      servicesByCategory,
      mappings: {
        businessTypeToServiceCategory: BUSINESS_TYPE_TO_SERVICE_CATEGORY,
        serviceCategoryToBusinessType: SERVICE_CATEGORY_TO_BUSINESS_TYPE,
      },
    });
  } catch (error) {
    console.error("❌ [Service Impact] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
