import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { businessId: true }
    });

    if (!currentUser?.businessId) {
      return NextResponse.json({ error: "User has no business associated" }, { status: 400 });
    }

    // Get notification templates for the business
    const templates = await prisma.notificationTemplate.findMany({
      where: { 
        businessId: currentUser.businessId,
        isActive: true 
      },
      orderBy: { name: "asc" },
    });

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
      select: { businessId: true }
    });

    if (!currentUser?.businessId) {
      return NextResponse.json({ error: "User has no business associated" }, { status: 400 });
    }

    const body = await request.json();
    const { name, type, trigger, subject, message, variables } = body;

    if (!name || !type || !trigger || !message) {
      return NextResponse.json(
        { error: "Name, type, trigger, and message are required" },
        { status: 400 }
      );
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        businessId: currentUser.businessId,
        name,
        type,
        trigger,
        subject,
        message,
        variables: variables ? JSON.stringify(variables) : null,
      }
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

// Send notification endpoint
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, customerId, variables } = body;

    if (!templateId || !customerId) {
      return NextResponse.json(
        { error: "Template ID and Customer ID are required" },
        { status: 400 }
      );
    }

    // Get template and customer
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId }
    });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
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
      Object.keys(variables).forEach(key => {
        finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
      });
    }

    // Log the communication (for now, we'll just log it)
    await prisma.communicationLog.create({
      data: {
        customerId: customer.id,
        type: template.type,
        direction: 'OUTGOING',
        content: finalMessage,
        status: 'SENT',
        sentBy: user.userId,
      }
    });

    // Here you would integrate with actual SMS/WhatsApp services
    // For now, we'll simulate sending
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
