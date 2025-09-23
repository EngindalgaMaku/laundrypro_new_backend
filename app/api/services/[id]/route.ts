import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// UPDATE Service
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceId = params.id;
    const body = await request.json();
    const { name, description, category, price, pricings, isActive } = body;

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

    // Check if service belongs to user's business
    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId: currentUser.businessId,
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found or access denied" },
        { status: 404 }
      );
    }

    // Update service and pricings in transaction
    const updatedService = await prisma.$transaction(async (tx) => {
      // Update the service
      const service = await tx.service.update({
        where: { id: serviceId },
        data: {
          name,
          description,
          category,
          isActive,
        },
      });

      // Delete existing pricings
      await tx.servicePricing.deleteMany({
        where: { serviceId: serviceId },
      });

      // Create new pricings if provided
      if (pricings && pricings.length > 0) {
        await tx.servicePricing.createMany({
          data: pricings.map((pricing: any) => ({
            serviceId: service.id,
            businessId: currentUser.businessId!,
            name: pricing.name,
            description: pricing.description,
            pricingType: pricing.pricingType,
            basePrice: pricing.basePrice,
            minQuantity: pricing.minQuantity || 1,
            maxQuantity: pricing.maxQuantity || 0,
            unit: pricing.unit,
            isActive: pricing.isActive !== false,
          })),
        });
      }

      // Return service with updated pricings
      return await tx.service.findUnique({
        where: { id: service.id },
        include: {
          pricings: {
            where: { isActive: true },
            orderBy: { basePrice: "asc" },
          },
        },
      });
    });

    console.log(`[SERVICES-UPDATE] Service ${serviceId} updated successfully`);

    return NextResponse.json({
      message: "Service updated successfully",
      service: updatedService,
    });
  } catch (error) {
    console.error("Update service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE Service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceId = params.id;

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

    // Check if service belongs to user's business
    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId: currentUser.businessId,
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found or access denied" },
        { status: 404 }
      );
    }

    // Delete service and pricings in transaction
    await prisma.$transaction(async (tx) => {
      // Delete pricings first
      await tx.servicePricing.deleteMany({
        where: { serviceId: serviceId },
      });

      // Delete the service
      await tx.service.delete({
        where: { id: serviceId },
      });
    });

    console.log(`[SERVICES-DELETE] Service ${serviceId} deleted successfully`);

    return NextResponse.json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
