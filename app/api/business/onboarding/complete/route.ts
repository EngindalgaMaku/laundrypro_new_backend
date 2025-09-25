import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

interface OnboardingData {
  selectedCategory: string;
  serviceTypes: string[];
}

// Service category mapping for smart defaults (matching frontend)
const SERVICE_CATEGORY_MAPPING = {
  full_service: ["DRY_CLEANING", "LAUNDRY", "IRONING"],
  specialty_cleaning: [
    "UPHOLSTERY_CLEANING",
    "CARPET_CLEANING",
    "CURTAIN_CLEANING",
  ],
  express_services: ["DRY_CLEANING", "IRONING"],
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 401 }
      );
    }

    const { businessId, userId } = decoded;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID not found in token" },
        { status: 400 }
      );
    }

    const data: OnboardingData = await request.json();

    console.log("[ONBOARDING] Completing onboarding:", {
      businessId,
      userId,
      selectedCategory: data.selectedCategory,
      serviceTypes: data.serviceTypes,
    });

    // Validate business exists and is not already onboarded (using raw query)
    const businessCheck = (await prisma.$queryRaw`
      SELECT id, name, onboarding_completed
      FROM businesses
      WHERE id = ${businessId}
    `) as any[];

    if (!businessCheck || businessCheck.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const business = businessCheck[0];
    if (business.onboarding_completed) {
      console.log("[ONBOARDING] Business already completed onboarding");
      return NextResponse.json(
        {
          message: "Onboarding already completed",
          business: {
            id: business.id,
            name: business.name,
            onboardingCompleted: true,
          },
        },
        { status: 200 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Update business onboarding status using raw query
      await tx.$executeRaw`
        UPDATE businesses
        SET onboarding_completed = TRUE, updated_at = NOW()
        WHERE id = ${businessId}
      `;

      // Add service types if provided
      if (data.serviceTypes && data.serviceTypes.length > 0) {
        // Remove any existing service types first (cleanup)
        await tx.businessServiceType.deleteMany({
          where: { businessId },
        });

        // Add new service types
        const serviceTypePromises = data.serviceTypes.map((serviceType) =>
          tx.businessServiceType.create({
            data: {
              businessId,
              serviceType: serviceType,
              isActive: true,
            },
          })
        );
        await Promise.all(serviceTypePromises);

        console.log(
          "[ONBOARDING] Created business service types:",
          data.serviceTypes
        );
      } else if (data.selectedCategory === "skipped") {
        console.log("[ONBOARDING] Onboarding skipped - no service types added");
      }

      return { id: businessId, name: business.name };
    });

    console.log("[ONBOARDING] Onboarding completed successfully:", {
      businessId: result.id,
      category: data.selectedCategory,
      serviceTypesCount: data.serviceTypes?.length || 0,
    });

    // Return success response
    return NextResponse.json(
      {
        message: "Onboarding completed successfully",
        business: {
          id: result.id,
          name: result.name,
          onboardingCompleted: true,
        },
        onboarding: {
          selectedCategory: data.selectedCategory,
          serviceTypes: data.serviceTypes || [],
          completedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ONBOARDING] Completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

// GET endpoint to check onboarding status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 401 }
      );
    }

    const { businessId } = decoded;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID not found in token" },
        { status: 400 }
      );
    }

    // Get business info with raw query
    const businessData = (await prisma.$queryRaw`
      SELECT id, name, onboarding_completed
      FROM businesses
      WHERE id = ${businessId}
    `) as any[];

    if (!businessData || businessData.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const business = businessData[0];

    // Get service types
    const serviceTypes = await prisma.businessServiceType.findMany({
      where: { businessId, isActive: true },
      select: { serviceType: true },
    });

    return NextResponse.json(
      {
        business: {
          id: business.id,
          name: business.name,
          onboardingCompleted: business.onboarding_completed,
          serviceTypes: serviceTypes.map((st) => st.serviceType),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ONBOARDING] Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}
