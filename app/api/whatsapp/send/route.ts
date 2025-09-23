import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createWhatsAppService } from "@/lib/whatsapp-service";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      customerId,
      orderId,
      phoneNumber,
      message,
      templateName,
      templateParams,
      languageCode = "tr",
    } = body;

    // Validate required fields
    if (!businessId || !phoneNumber) {
      return NextResponse.json(
        { error: "Business ID and phone number are required" },
        { status: 400 }
      );
    }

    if (!message && !templateName) {
      return NextResponse.json(
        { error: "Either message text or template name is required" },
        { status: 400 }
      );
    }

    // Get WhatsApp service instance
    const whatsappService = await createWhatsAppService(businessId, prisma);

    if (!whatsappService) {
      return NextResponse.json(
        { error: "WhatsApp Business API not configured for this business" },
        { status: 400 }
      );
    }

    let result;

    if (templateName) {
      // Send template message
      result = await whatsappService.sendTemplateMessage(
        phoneNumber,
        templateName,
        languageCode,
        templateParams || [],
        customerId,
        orderId,
        businessId
      );
    } else {
      // Send text message
      result = await whatsappService.sendTextMessage(
        phoneNumber,
        message,
        customerId,
        orderId,
        businessId
      );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: "Message sent successfully",
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send message" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("WhatsApp send API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

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
    // Check if WhatsApp Business API is configured
    const settings = await prisma.whatsAppSettings.findUnique({
      where: { businessId },
      select: {
        isEnabled: true,
        displayPhoneNumber: true,
        qualityRating: true,
        rateLimitHit: true,
        lastSync: true,
      },
    });

    if (!settings) {
      return NextResponse.json({
        configured: false,
        message: "WhatsApp Business API not configured",
      });
    }

    return NextResponse.json({
      configured: settings.isEnabled,
      settings: {
        displayPhoneNumber: settings.displayPhoneNumber,
        qualityRating: settings.qualityRating,
        rateLimitHit: settings.rateLimitHit,
        lastSync: settings.lastSync,
      },
    });
  } catch (error: any) {
    console.error("WhatsApp status API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
