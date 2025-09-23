import { NextRequest, NextResponse } from "next/server";

import { getPlanForBusiness } from "@/lib/entitlements";



import { prisma } from "@/lib/db";
// Get WhatsApp Business API settings for a business
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
    const settings = await prisma.whatsAppSettings.findUnique({
      where: { businessId },
      select: {
        id: true,
        businessId: true,
        isEnabled: true,
        phoneNumberId: true,
        businessAccountId: true,
        displayPhoneNumber: true,
        qualityRating: true,
        rateLimitHit: true,
        lastSync: true,
        createdAt: true,
        updatedAt: true,
        // Don't return sensitive data like accessToken and webhookToken
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("WhatsApp settings GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Create or update WhatsApp Business API settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      isEnabled,
      accessToken,
      phoneNumberId,
      businessAccountId,
      webhookToken,
      displayPhoneNumber,
    } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Validate required fields if enabling WhatsApp
    if (isEnabled && (!accessToken || !phoneNumberId)) {
      return NextResponse.json(
        {
          error:
            "Access token and phone number ID are required when enabling WhatsApp",
        },
        { status: 400 }
      );
    }

    // Plan gate: enabling requires PRO plan
    if (isEnabled) {
      const plan = await getPlanForBusiness(businessId);
      if (plan !== "PRO") {
        return NextResponse.json(
          { error: "WhatsApp entegrasyonunu etkinleştirmek için PRO plan gereklidir" },
          { status: 402 }
        );
      }
    }

    // Test the configuration if provided
    let testResult = null;
    if (isEnabled && accessToken && phoneNumberId) {
      testResult = await testWhatsAppConfiguration({
        accessToken,
        phoneNumberId,
        businessAccountId,
      });

      if (!testResult.success) {
        return NextResponse.json(
          {
            error: "WhatsApp configuration test failed",
            details: testResult.error,
          },
          { status: 400 }
        );
      }
    }

    const settings = await prisma.whatsAppSettings.upsert({
      where: { businessId },
      update: {
        isEnabled: isEnabled ?? false,
        ...(accessToken && { accessToken }),
        ...(phoneNumberId && { phoneNumberId }),
        ...(businessAccountId && { businessAccountId }),
        ...(webhookToken && { webhookToken }),
        ...(displayPhoneNumber && { displayPhoneNumber }),
        ...(testResult?.qualityRating && {
          qualityRating: testResult.qualityRating,
        }),
        rateLimitHit: false, // Reset rate limit flag on update
        lastSync: new Date(),
      },
      create: {
        businessId,
        isEnabled: isEnabled ?? false,
        accessToken: accessToken || "",
        phoneNumberId: phoneNumberId || "",
        businessAccountId: businessAccountId || "",
        webhookToken: webhookToken || "",
        displayPhoneNumber: displayPhoneNumber || "",
        qualityRating: testResult?.qualityRating || "UNKNOWN",
      },
      select: {
        id: true,
        businessId: true,
        isEnabled: true,
        phoneNumberId: true,
        businessAccountId: true,
        displayPhoneNumber: true,
        qualityRating: true,
        rateLimitHit: true,
        lastSync: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
      message: "WhatsApp settings saved successfully",
      ...(testResult && { testResult }),
    });
  } catch (error: any) {
    console.error("WhatsApp settings POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Test WhatsApp Business API connection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, accessToken, phoneNumberId, businessAccountId } = body;

    if (!businessId || !accessToken || !phoneNumberId) {
      return NextResponse.json(
        {
          error: "Business ID, access token, and phone number ID are required",
        },
        { status: 400 }
      );
    }

    const testResult = await testWhatsAppConfiguration({
      accessToken,
      phoneNumberId,
      businessAccountId,
    });

    if (testResult.success) {
      // Update settings with test results
      await prisma.whatsAppSettings.upsert({
        where: { businessId },
        update: {
          qualityRating: testResult.qualityRating || "UNKNOWN",
          rateLimitHit: false,
          lastSync: new Date(),
        },
        create: {
          businessId,
          isEnabled: false, // Don't auto-enable, user must explicitly enable
          accessToken: "",
          phoneNumberId: "",
          qualityRating: testResult.qualityRating || "UNKNOWN",
        },
      });
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success
        ? "Connection test successful"
        : "Connection test failed",
      details: testResult,
    });
  } catch (error: any) {
    console.error("WhatsApp settings test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Delete WhatsApp settings (disable integration)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    // Instead of deleting, disable the integration
    await prisma.whatsAppSettings.update({
      where: { businessId },
      data: {
        isEnabled: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp integration disabled successfully",
    });
  } catch (error: any) {
    console.error("WhatsApp settings DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Test WhatsApp Business API configuration
async function testWhatsAppConfiguration(config: {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
}) {
  try {
    const axios = require("axios");

    // Test by getting phone number info
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${config.phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
        params: {
          fields: "display_phone_number,verified_name,quality_rating",
        },
      }
    );

    return {
      success: true,
      displayPhoneNumber: response.data.display_phone_number,
      verifiedName: response.data.verified_name,
      qualityRating: response.data.quality_rating || "UNKNOWN",
    };
  } catch (error: any) {
    return {
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "Configuration test failed",
    };
  }
}
