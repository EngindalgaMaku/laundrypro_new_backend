import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { getPlanForBusiness } from "@/lib/entitlements";

// GET /api/whatsapp/settings/[businessId]
// Returns WhatsApp settings for the business, creating a default record if missing
async function handler(
  request: NextRequest,
  auth: { user: any; business?: any }
) {
  // Extract dynamic [businessId] from pathname
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const businessId = segments[segments.length - 1];

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  // Basic authorization: user must belong to the same business (or be a system user without business)
  if (auth.user?.businessId && auth.user.businessId !== businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Try to find existing settings
    let settings = await prisma.whatsAppSettings.findUnique({
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
      },
    });

    // Create default if missing
    if (!settings) {
      const created = await prisma.whatsAppSettings.create({
        data: {
          businessId,
          isEnabled: false,
          accessToken: "",
          phoneNumberId: "",
          businessAccountId: "",
          webhookToken: "",
          displayPhoneNumber: "",
          qualityRating: "UNKNOWN",
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
      settings = created;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[WhatsApp Settings][GET] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth((req: NextRequest, authData: { user: any; business?: any }) =>
  handler(req, authData)
);

// PATCH /api/whatsapp/settings/[businessId]
// Update WhatsApp settings (OWNER and MANAGER only). Upserts if missing.
async function patchHandler(
  request: NextRequest,
  auth: { user: any; business?: any }
) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const businessId = segments[segments.length - 1];

  if (!businessId) {
    return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
  }

  // Role-based authorization
  const role = auth.user?.role as string | undefined;
  if (!role || (role !== "OWNER" && role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (auth.user?.businessId && auth.user.businessId !== businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    isEnabled,
    accessToken,
    phoneNumberId,
    businessAccountId,
    webhookToken,
    displayPhoneNumber,
  } = body || {};

  // If enabling, ensure PRO plan
  if (isEnabled === true) {
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "WhatsApp entegrasyonunu etkinleştirmek için PRO plan gereklidir" },
        { status: 402 }
      );
    }
  }

  // Basic validation when enabling
  if (isEnabled === true && (!accessToken || !phoneNumberId)) {
    return NextResponse.json(
      { error: "Etkinleştirmek için accessToken ve phoneNumberId zorunludur" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.whatsAppSettings.upsert({
      where: { businessId },
      update: {
        ...(isEnabled !== undefined ? { isEnabled } : {}),
        ...(accessToken !== undefined ? { accessToken } : {}),
        ...(phoneNumberId !== undefined ? { phoneNumberId } : {}),
        ...(businessAccountId !== undefined ? { businessAccountId } : {}),
        ...(webhookToken !== undefined ? { webhookToken } : {}),
        ...(displayPhoneNumber !== undefined ? { displayPhoneNumber } : {}),
        lastSync: new Date(),
        rateLimitHit: false,
      },
      create: {
        businessId,
        isEnabled: !!isEnabled,
        accessToken: accessToken || "",
        phoneNumberId: phoneNumberId || "",
        businessAccountId: businessAccountId || "",
        webhookToken: webhookToken || "",
        displayPhoneNumber: displayPhoneNumber || "",
        qualityRating: "UNKNOWN",
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

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("[WhatsApp Settings][PATCH] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const PATCH = withAuth((req: NextRequest, authData: { user: any; business?: any }) =>
  patchHandler(req, authData)
);

// PUT /api/whatsapp/settings/[businessId]
// Test WhatsApp Business API connection and store quality rating. OWNER/MANAGER only.
async function putHandler(
  request: NextRequest,
  auth: { user: any; business?: any }
) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const businessId = segments[segments.length - 1];

  if (!businessId) {
    return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
  }

  const role = auth.user?.role as string | undefined;
  if (!role || (role !== "OWNER" && role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (auth.user?.businessId && auth.user.businessId !== businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { accessToken, phoneNumberId, businessAccountId } = await request
    .json()
    .catch(() => ({}));

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json(
      { error: "Business ID, access token, and phone number ID are required" },
      { status: 400 }
    );
  }

  // Test configuration via Graph API
  try {
    const axios = require("axios");
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: "display_phone_number,verified_name,quality_rating" },
      }
    );

    const qualityRating = response.data.quality_rating || "UNKNOWN";

    // Persist test results (no secrets)
    await prisma.whatsAppSettings.upsert({
      where: { businessId },
      update: { qualityRating, rateLimitHit: false, lastSync: new Date() },
      create: {
        businessId,
        isEnabled: false,
        accessToken: "",
        phoneNumberId: "",
        businessAccountId: "",
        webhookToken: "",
        displayPhoneNumber: response.data.display_phone_number || "",
        qualityRating,
      },
    });

    return NextResponse.json({
      success: true,
      details: {
        displayPhoneNumber: response.data.display_phone_number,
        verifiedName: response.data.verified_name,
        qualityRating,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        details: {
          error:
            error.response?.data?.error?.message || error.message || "Test failed",
        },
      },
      { status: 200 }
    );
  }
}

export const PUT = withAuth((req: NextRequest, authData: { user: any; business?: any }) =>
  putHandler(req, authData)
);
