import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get message status and conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const customerId = searchParams.get("customerId");
  const orderId = searchParams.get("orderId");
  const messageId = searchParams.get("messageId");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    let messages;

    if (messageId) {
      // Get specific message status
      messages = await prisma.whatsAppMessage.findMany({
        where: {
          businessId,
          messageId,
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
      });
    } else if (customerId) {
      // Get customer conversation history
      messages = await prisma.whatsAppMessage.findMany({
        where: {
          businessId,
          customerId,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
      });
    } else if (orderId) {
      // Get order-related messages
      messages = await prisma.whatsAppMessage.findMany({
        where: {
          businessId,
          orderId,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
      });
    } else {
      // Get all business messages
      messages = await prisma.whatsAppMessage.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
        },
      });
    }

    // Get message statistics
    const stats = await prisma.whatsAppMessage.groupBy({
      by: ["status", "direction"],
      where: {
        businessId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      success: true,
      messages,
      stats,
      total: messages.length,
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

// Update message status manually (for testing or manual updates)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, messageId, status, errorCode, errorMessage } = body;

    if (!businessId || !messageId || !status) {
      return NextResponse.json(
        { error: "Business ID, message ID, and status are required" },
        { status: 400 }
      );
    }

    const message = await prisma.whatsAppMessage.updateMany({
      where: {
        businessId,
        messageId,
      },
      data: {
        status,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updated: message.count,
      message: "Message status updated successfully",
    });
  } catch (error: any) {
    console.error("WhatsApp status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
