import { NextRequest, NextResponse } from "next/server";

import { createWhatsAppService } from "@/lib/whatsapp-service";



import { prisma } from "@/lib/db";
// Webhook verification for WhatsApp Business API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Check if mode and token are correct
  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    console.log("Webhook verified successfully!");
    return new NextResponse(challenge);
  } else {
    console.log("Webhook verification failed");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// Handle incoming WhatsApp webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get("x-hub-signature-256");
    if (signature && process.env.WHATSAPP_APP_SECRET) {
      const crypto = require("crypto");
      const expectedSignature =
        "sha256=" +
        crypto
          .createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
          .update(JSON.stringify(body))
          .digest("hex");

      if (signature !== expectedSignature) {
        console.log("Invalid webhook signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Log webhook payload for debugging
    console.log("Webhook received:", JSON.stringify(body, null, 2));

    // Process webhook only if it's a WhatsApp business API event
    if (body.object === "whatsapp_business_account") {
      await processWhatsAppWebhook(body);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);

    // Still return 200 to prevent WhatsApp from retrying
    return NextResponse.json({ received: true });
  }
}

async function processWhatsAppWebhook(payload: any) {
  try {
    // Find the business associated with this webhook
    for (const entry of payload.entry) {
      const businessAccountId = entry.id;

      // Find business by WhatsApp Business Account ID
      const settings = await prisma.whatsAppSettings.findFirst({
        where: { businessAccountId },
        include: { business: true },
      });

      if (!settings || !settings.business) {
        console.log(
          `No business found for WhatsApp Business Account ID: ${businessAccountId}`
        );
        continue;
      }

      const businessId = settings.business.id;

      // Get WhatsApp service instance
      const whatsappService = await createWhatsAppService(businessId, prisma);

      if (whatsappService) {
        // Process the webhook using the WhatsApp service
        await whatsappService.processWebhook(payload, businessId);
      }

      // Handle specific webhook events
      for (const change of entry.changes) {
        if (change.field === "messages") {
          await handleMessageEvents(change.value, businessId);
        }

        if (change.field === "message_template_status_update") {
          await handleTemplateStatusUpdate(change.value, businessId);
        }
      }
    }
  } catch (error: any) {
    console.error("Error processing WhatsApp webhook:", error);

    // Log failed webhook for manual review
    await prisma.whatsAppWebhook.create({
      data: {
        event: "webhook_error",
        payload: JSON.stringify(payload),
        processed: false,
      },
    });
  }
}

async function handleMessageEvents(messageData: any, businessId: string) {
  try {
    // Handle incoming messages
    if (messageData.messages) {
      for (const message of messageData.messages) {
        console.log(
          `Incoming message from ${message.from}: ${message.text?.body}`
        );

        // Check if this is from a known customer
        const customer = await prisma.customer.findFirst({
          where: {
            businessId,
            OR: [{ whatsapp: message.from }, { phone: message.from }],
          },
        });

        // Auto-respond to new messages if customer exists
        if (customer && message.text?.body) {
          await handleAutoResponse(customer, message, businessId);
        } else if (!customer) {
          // Handle new prospect
          console.log(`New WhatsApp prospect: ${message.from}`);
          await handleNewProspect(message.from, message.text?.body, businessId);
        }
      }
    }

    // Handle message status updates
    if (messageData.statuses) {
      for (const status of messageData.statuses) {
        console.log(`Message ${status.id} status: ${status.status}`);

        // Update message status in database
        await prisma.whatsAppMessage.updateMany({
          where: {
            businessId,
            messageId: status.id,
          },
          data: {
            status: status.status,
            timestamp: new Date(parseInt(status.timestamp) * 1000),
            ...(status.errors && {
              errorCode: status.errors[0]?.code?.toString(),
              errorMessage: status.errors[0]?.message,
            }),
          },
        });
      }
    }
  } catch (error: any) {
    console.error("Error handling message events:", error);
  }
}

async function handleTemplateStatusUpdate(
  templateData: any,
  businessId: string
) {
  try {
    const {
      message_template_id,
      message_template_name,
      message_template_language,
      event,
    } = templateData;

    console.log(
      `Template ${message_template_name} (${message_template_language}) status: ${event}`
    );

    // Update template status in database
    await prisma.whatsAppTemplate.updateMany({
      where: {
        businessId,
        name: message_template_name,
        language: message_template_language,
      },
      data: {
        status: event, // APPROVED, REJECTED, etc.
      },
    });
  } catch (error: any) {
    console.error("Error handling template status update:", error);
  }
}

async function handleAutoResponse(
  customer: any,
  message: any,
  businessId: string
) {
  try {
    const messageText = message.text?.body?.toLowerCase();

    // Simple auto-response logic
    if (messageText?.includes("merhaba") || messageText?.includes("selam")) {
      const whatsappService = await createWhatsAppService(businessId, prisma);
      if (whatsappService) {
        await whatsappService.sendTextMessage(
          message.from,
          `Merhaba ${customer.firstName}! Size nasıl yardımcı olabilirim?`,
          customer.id,
          undefined,
          businessId
        );
      }
    }

    // Handle order status inquiries
    if (messageText?.includes("sipariş") && messageText?.includes("durum")) {
      // Find latest order for customer
      const latestOrder = await prisma.order.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
      });

      if (latestOrder) {
        const whatsappService = await createWhatsAppService(businessId, prisma);
        if (whatsappService) {
          await whatsappService.sendTextMessage(
            message.from,
            `${latestOrder.orderNumber} numaralı siparişinizin durumu: ${latestOrder.status}`,
            customer.id,
            latestOrder.id,
            businessId
          );
        }
      }
    }
  } catch (error: any) {
    console.error("Error in auto-response:", error);
  }
}

async function handleNewProspect(
  waId: string,
  messageText: string,
  businessId: string
) {
  try {
    // Create a prospect record or send welcome message
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (business) {
      const whatsappService = await createWhatsAppService(businessId, prisma);
      if (whatsappService) {
        await whatsappService.sendTextMessage(
          waId,
          `Merhaba! ${business.name}'e hoş geldiniz. Size nasıl yardımcı olabiliriz?`,
          undefined,
          undefined,
          businessId
        );
      }
    }
  } catch (error: any) {
    console.error("Error handling new prospect:", error);
  }
}
