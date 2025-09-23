import { NextRequest, NextResponse } from "next/server";

import { createWhatsAppService } from "@/lib/whatsapp-service";



import { prisma } from "@/lib/db";
// Get WhatsApp message templates for a business
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get templates from database
    const dbTemplates = await prisma.whatsAppTemplate.findMany({
      where: { businessId },
      orderBy: { displayName: "asc" },
    });

    // Get templates from WhatsApp API
    const whatsappService = await createWhatsAppService(businessId, prisma);
    let apiTemplates: any[] = [];

    if (whatsappService) {
      apiTemplates = await whatsappService.getMessageTemplates();
    }

    return NextResponse.json({
      success: true,
      templates: {
        database: dbTemplates,
        whatsapp: apiTemplates,
      },
    });
  } catch (error: any) {
    console.error("Templates API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Create or update a WhatsApp message template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      name,
      displayName,
      category = "UTILITY",
      language = "tr",
      components,
      variables,
    } = body;

    if (!businessId || !name || !displayName || !components) {
      return NextResponse.json(
        {
          error: "Business ID, name, display name, and components are required",
        },
        { status: 400 }
      );
    }

    // Save template to database
    const template = await prisma.whatsAppTemplate.upsert({
      where: {
        businessId_name: {
          businessId,
          name,
        },
      },
      update: {
        displayName,
        category,
        language,
        components: JSON.stringify(components),
        variables: variables ? JSON.stringify(variables) : null,
        updatedAt: new Date(),
      },
      create: {
        businessId,
        name,
        displayName,
        category,
        language,
        components: JSON.stringify(components),
        variables: variables ? JSON.stringify(variables) : null,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      template,
      message: "Template saved successfully",
    });
  } catch (error: any) {
    console.error("Template creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Update template status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, status, isActive } = body;

    if (!businessId || !name) {
      return NextResponse.json(
        { error: "Business ID and template name are required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const template = await prisma.whatsAppTemplate.update({
      where: {
        businessId_name: {
          businessId,
          name,
        },
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      template,
      message: "Template updated successfully",
    });
  } catch (error: any) {
    console.error("Template update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Delete a template
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const name = searchParams.get("name");

  if (!businessId || !name) {
    return NextResponse.json(
      { error: "Business ID and template name are required" },
      { status: 400 }
    );
  }

  try {
    await prisma.whatsAppTemplate.delete({
      where: {
        businessId_name: {
          businessId,
          name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    console.error("Template deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}
