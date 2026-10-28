import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_TEMPLATES = [
  {
    name: "Sipariş Onayı - Email",
    type: "email",
    trigger: "order_confirmed",
    subject: "Siparişiniz Onaylandı - #{order_number}",
    message:
      "Merhaba #{customer_name},\n\nSiparişiniz başarıyla onaylanmıştır.\n\nSipariş No: #{order_number}\nToplam Tutar: #{total_amount} TL\nTeslim Tarihi: #{delivery_date}\n\nTeşekkür ederiz,\n#{business_name}",
    isActive: true,
  },
  {
    name: "Sipariş Onayı - SMS",
    type: "sms",
    trigger: "order_confirmed",
    subject: null,
    message:
      "#{business_name}: Siparişiniz onaylandı. Sipariş No: #{order_number}. Teslim: #{delivery_date}. Bilgi: #{business_phone}",
    isActive: true,
  },
  {
    name: "Hazır - WhatsApp",
    type: "whatsapp",
    trigger: "ready_for_delivery",
    subject: null,
    message:
      "Merhaba #{customer_name}! 🎉\n\nSiparişiniz hazır!\nSipariş No: #{order_number}\n\nTeslimat için sizinle iletişime geçeceğiz.\n\n#{business_name}",
    isActive: true,
  },
];

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

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    let templates = await prisma.notificationTemplate.findMany({
      where: {
        businessId: currentUser.businessId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    // Seed default templates once if the business has none at all
    if (templates.length === 0 && !activeOnly) {
      const existingCount = await prisma.notificationTemplate.count({
        where: { businessId: currentUser.businessId },
      });
      if (existingCount === 0) {
        await prisma.notificationTemplate.createMany({
          data: DEFAULT_TEMPLATES.map((t) => ({
            ...t,
            businessId: currentUser.businessId!,
          })),
        });
        templates = await prisma.notificationTemplate.findMany({
          where: { businessId: currentUser.businessId },
          orderBy: { createdAt: "asc" },
        });
      }
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Get notification templates error:", error);
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
    const { name, type, trigger, subject, message, content, variables, isActive } = body;
    const resolvedMessage = message || content;

    if (!name || !type || !trigger || !resolvedMessage) {
      return NextResponse.json(
        { error: "Name, type, trigger, and message are required" },
        { status: 400 }
      );
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        businessId: currentUser.businessId,
        name,
        type: String(type).toLowerCase(),
        trigger,
        subject: subject || null,
        message: resolvedMessage,
        isActive: isActive ?? true,
        variables: variables ? JSON.stringify(variables) : null,
      },
    });

    return NextResponse.json({
      message: "Notification template created successfully",
      template,
    });
  } catch (error) {
    console.error("Create notification template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { id, name, type, trigger, subject, message, content, isActive, variables } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.notificationTemplate.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const resolvedMessage = message ?? content;
    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type: String(type).toLowerCase() } : {}),
        ...(trigger !== undefined ? { trigger } : {}),
        ...(subject !== undefined ? { subject: subject || null } : {}),
        ...(resolvedMessage !== undefined ? { message: resolvedMessage } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(variables !== undefined
          ? { variables: variables ? JSON.stringify(variables) : null }
          : {}),
      },
    });

    return NextResponse.json({
      message: "Notification template updated successfully",
      template: updated,
    });
  } catch (error) {
    console.error("Update notification template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const url = new URL(request.url);
    let id = url.searchParams.get("id");
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.notificationTemplate.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    await prisma.notificationTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Notification template deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Send notification endpoint
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { templateId, customerId, variables } = body;

    if (!templateId || !customerId) {
      return NextResponse.json(
        { error: "Template ID and Customer ID are required" },
        { status: 400 }
      );
    }

    // Get template and customer scoped to user's business
    const template = await prisma.notificationTemplate.findFirst({
      where: {
        id: templateId,
        businessId: currentUser.businessId,
      },
    });

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: currentUser.businessId,
      },
    });

    if (!template || !customer) {
      return NextResponse.json(
        { error: "Template or customer not found" },
        { status: 404 }
      );
    }

    // Replace variables in message
    let finalMessage = template.message;
    if (variables) {
      Object.keys(variables).forEach((key) => {
        finalMessage = finalMessage.replace(
          new RegExp(`(\\{\\{${key}\\}\\}|#\\{${key}\\})`, "g"),
          variables[key]
        );
      });
    }

    // Log the communication
    await prisma.communicationLog.create({
      data: {
        customerId: customer.id,
        type: template.type,
        direction: "OUTGOING",
        content: finalMessage,
        status: "SENT",
        sentBy: user.userId,
      },
    });

    console.log(`Sending ${template.type} to ${customer.phone}:`, finalMessage);

    return NextResponse.json({
      message: "Notification sent successfully",
      type: template.type,
      recipient: customer.phone,
      content: finalMessage,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
